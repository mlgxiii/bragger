import { ComposerAgent, DocumentSource, IndexingAgent, JudgeAgent } from '@contextrie/core';
import type { LanguageModel } from 'ai';
import { readTree } from './files';
import { parseTypemark } from './typemark';

type Indexed = Awaited<ReturnType<IndexingAgent['run']>>;
let cache: { key: string; indexed: Indexed } | undefined;

/** Every brand/ section becomes a Contextrie source, so the judge can keep only what this post needs. */
async function brandSources() {
	const files = await readTree('brand');
	const sources: DocumentSource[] = [];
	for (const file of files) {
		for (const [i, s] of parseTypemark(file.text).entries()) {
			const props = Object.entries(s.props).map(([k, v]) => `${k}: ${v}`).join('\n');
			const content = [s.title && `# ${s.title}`, props, s.body.trim()].filter(Boolean).join('\n');
			if (content.trim()) sources.push(new DocumentSource(`${file.path}#${i}`, undefined, content));
		}
	}
	return { sources, key: files.map((f) => f.path + f.text.length + f.text.slice(0, 200)).join('|') };
}

export type ContextResult = {
	context: string;
	kept: { id: string; score: number; reason: string }[];
	dropped: number;
};

export async function brandContext(model: LanguageModel, task: string): Promise<ContextResult> {
	const { sources, key } = await brandSources();
	if (!sources.length) return { context: '', kept: [], dropped: 0 };
	if (cache?.key !== key) cache = { key, indexed: await new IndexingAgent(model).add(sources).run() };
	const indexed = cache.indexed;
	const t = { objective: 'response' as const, input: task };
	const judgments = await new JudgeAgent(model).from(indexed).run(t);
	const judged = Object.fromEntries(indexed.map((source) => [source.id, { source, decision: judgments[source.id] }]));
	const context = await new ComposerAgent(model).from(judged).run(t);
	const scored = indexed.map((s) => ({ id: s.id, score: judgments[s.id]?.score ?? 0, reason: judgments[s.id]?.reason ?? '' }));
	const kept = scored.filter((s) => s.score >= 0.5).sort((a, b) => b.score - a.score);
	return { context: String(context), kept, dropped: scored.length - kept.length };
}
