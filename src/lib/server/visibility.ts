import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { readTree } from './files';
import { docProps } from './typemark';
import { pickModel } from './model';

export type Answer = {
	question: string;
	mentioned: boolean;
	rank: number | null;
	named: string[];
	quote: string;
	sources: string[];
};

export async function brandProfile() {
	const files = await readTree('brand');
	return Object.assign({}, ...files.map((f) => docProps(f.text))) as Record<string, string>;
}

/** Ask an answer engine the questions buyers ask, with web search on, and see who it names. */
export async function visibility(questions: string[]) {
	const { model, id, provider, search } = pickModel();
	const profile = await brandProfile();
	const brand = profile.name ?? 'the brand';
	const aliases = [brand, ...(profile.aliases?.split(',').map((s) => s.trim()) ?? []), profile.domain].filter(Boolean) as string[];

	const answers = await Promise.all(
		questions.map(async (question): Promise<Answer> => {
			const r = await generateText({ model, tools: search, prompt: question });
			const { object } = await generateObject({
				model,
				temperature: 0,
				schema: z.object({
					named: z.array(z.string()).describe('Companies or products recommended, in the order the answer gives them'),
					quote: z.string().describe(`Exact sentence that mentions ${brand}, or empty`)
				}),
				prompt: `Answer to "${question}":\n\n${r.text}\n\nList the companies or products it names, in order. Then quote the sentence that mentions ${brand} (aliases: ${aliases.join(', ')}), if any.`
			});
			const hit = (s: string) => aliases.some((a) => s.toLowerCase().includes(a.toLowerCase()));
			const idx = object.named.findIndex(hit);
			return {
				question,
				mentioned: hit(r.text),
				rank: idx >= 0 ? idx + 1 : null,
				named: object.named,
				quote: object.quote && r.text.includes(object.quote) ? object.quote : '',
				sources: [...new Set(r.sources.filter((s) => s.sourceType === 'url').map((s) => s.url))]
			};
		})
	);
	return { engine: `${provider} / ${id} with web search`, brand, answers };
}
