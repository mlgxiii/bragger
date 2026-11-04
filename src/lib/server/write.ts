import { generateText } from 'ai';
import { brandContext } from './context';
import { loadFormats } from './formats';
import { pickModel } from './model';
import { readUrl } from './source';
import { runAll, type TestResult } from './tests';

export type WriteInput = { topic: string; url?: string; format: string; research?: boolean };
export type Step =
	| { step: 'model'; detail: string }
	| { step: 'context'; kept: { id: string; score: number; reason: string }[]; dropped: number }
	| { step: 'source'; title: string; chars: number }
	| { step: 'research'; notes: string; sources: { url: string; title?: string }[] }
	| { step: 'draft'; text: string; round: number }
	| { step: 'check'; results: TestResult[]; round: number }
	| { step: 'done'; text: string; path: string; passed: boolean }
	| { step: 'error'; message: string };

const failing = (r: TestResult[]) => r.filter((t) => t.outcome === 'fail');

export async function* write(input: WriteInput): AsyncGenerator<Step> {
	const { model, id, provider, search } = pickModel();
	yield { step: 'model', detail: `${provider} / ${id}` };

	const format = (await loadFormats()).find((f) => f.id === input.format);
	if (!format) throw new Error(`No format "${input.format}" in .agents/snippets/`);

	const task = `Write a ${format.title} about: ${input.topic}`;
	const ctx = await brandContext(model, task);
	yield { step: 'context', kept: ctx.kept, dropped: ctx.dropped };

	let source = '';
	if (input.url) {
		const page = await readUrl(input.url);
		source = `<source url="${input.url}" title="${page.title}">\n${page.text}\n</source>`;
		yield { step: 'source', title: page.title, chars: page.text.length };
	}

	let research = '';
	if (input.research) {
		const r = await generateText({
			model,
			tools: search,
			prompt: `Find 3-5 recent, checkable facts that would help ${task}. List each fact with its source URL. Plain list, no prose.`
		});
		research = r.text;
		const sources = r.sources.filter((s) => s.sourceType === 'url').map((s) => ({ url: s.url, title: s.title }));
		yield { step: 'research', notes: research, sources };
	}

	const system = [
		'You write marketing content for the company described in <brand>. Use only facts from <brand>, <source> and <research>. Never invent numbers, customers or quotes.',
		`Format instructions:\n${format.instructions}`,
		'Return only the content itself, no preface.'
	].join('\n\n');
	const prompt = [
		`<brand>\n${ctx.context}\n</brand>`,
		source,
		research && `<research>\n${research}\n</research>`,
		`Topic: ${input.topic}`
	].filter(Boolean).join('\n\n');

	let { text } = await generateText({ model, system, prompt });
	yield { step: 'draft', text, round: 1 };
	let results = await runAll(model, format.output, text);
	yield { step: 'check', results, round: 1 };

	// One repair round: hand the writer the failed checks, their quotes and fixes.
	if (failing(results).length) {
		const notes = failing(results)
			.flatMap((t) => t.checks.filter((c) => c.outcome === 'fail'))
			.map((c) => `- ${c.message} Fix: ${c.fix}${c.findings.length ? ` Offending: ${c.findings.map((f) => `"${f.quote}"`).join(', ')}` : ''}`)
			.join('\n');
		({ text } = await generateText({
			model,
			system,
			prompt: `${prompt}\n\nYour previous draft:\n<draft>\n${text}\n</draft>\n\nIt failed these checks. Rewrite it so they pass, keeping everything else:\n${notes}`
		}));
		yield { step: 'draft', text, round: 2 };
		results = await runAll(model, format.output, text);
		yield { step: 'check', results, round: 2 };
	}
	yield { step: 'done', text, path: format.output, passed: !failing(results).length };
}
