import { generateObject, type LanguageModel } from 'ai';
import { z } from 'zod';
import { Engine, type Patterns } from '#agent-tests';

export type Finding = { quote: string; note?: string };
const list = (p: Patterns) => (Array.isArray(p) ? p : [p]);

/** fast: regex only. Score 1 when a pattern hits. Findings are the matched text. */
export class FastEngine extends Engine<{ patterns: Patterns }> {
	findings: Finding[] = [];
	protected readonly paramsSchema = z.object({ patterns: z.union([z.string(), z.array(z.string()).min(1)]) });
	protected async score(input: string, { patterns }: { patterns: Patterns }) {
		this.findings = list(patterns).flatMap((p) =>
			[...input.matchAll(new RegExp(p, 'gm'))].map((m) => ({ quote: m[0] }))
		);
		return this.findings.length ? 1 : 0;
	}
}

const Judgment = z.object({
	violations: z.array(z.object({ quote: z.string().describe('Exact text copied from the input'), note: z.string() })),
	score: z.number().min(0).max(1).describe('Probability that the input breaks the rule')
});

/** smart and deep: a model judges the rule. Quotes that are not in the input are dropped. */
export class ModelEngine extends Engine<{ ask: string; reasoning?: 'low' | 'medium' | 'high' }> {
	findings: Finding[] = [];
	constructor(private model: LanguageModel) {
		super();
	}
	protected readonly paramsSchema = z.object({ ask: z.string(), reasoning: z.enum(['low', 'medium', 'high']).optional() });
	protected async score(input: string, { ask, reasoning }: { ask: string; reasoning?: string }) {
		const { object } = await generateObject({
			model: this.model,
			schema: Judgment,
			temperature: 0,
			system:
				'You check text against one rule. Copy offending text exactly. If nothing breaks the rule, return no violations and a low score.' +
				(reasoning === 'high' ? ' Think carefully about edge cases before answering.' : ''),
			prompt: `Rule: ${ask}\n\n<input>\n${input}\n</input>`
		});
		this.findings = object.violations.filter((v) => v.quote && input.includes(v.quote));
		// A model that claims a violation but cannot quote it is unsure, not sure.
		if (object.score >= 0.5 && !this.findings.length && object.violations.length) return 0.5;
		return object.score;
	}
}

/** Yes/no classifier for content triggers ("This file contains text shown to an end user."). */
export async function classify(model: LanguageModel, statement: string, input: string) {
	const { object } = await generateObject({
		model,
		schema: z.object({ probability: z.number().min(0).max(1) }),
		temperature: 0,
		prompt: `How likely is this statement true of the input? Statement: ${statement}\n\n<input>\n${input}\n</input>`
	});
	return object.probability;
}
