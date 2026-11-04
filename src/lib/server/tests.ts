import type { LanguageModel } from 'ai';
import picomatch from 'picomatch';
import { parseTestYaml, type AgentTest, type Check, type TestOutcome } from '#agent-tests';
import { classify, FastEngine, ModelEngine, type Finding } from './engines';
import { readTree } from './files';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './files';

export type CheckResult = {
	test: string;
	check: string;
	outcome: Exclude<TestOutcome, 'skip'>;
	stage: 'fast' | 'smart' | 'deep';
	message: string;
	fix: string;
	findings: Finding[];
};
export type TestResult = { id: string; title: string; outcome: TestOutcome; checks: CheckResult[] };

export async function loadTests(): Promise<(AgentTest & { prose: string })[]> {
	const files = await readTree('.agents/tests', '.yaml');
	return Promise.all(
		files.map(async (f) => ({
			...parseTestYaml(f.text),
			prose: await readFile(join(ROOT, f.path.replace(/test\.yaml$/, 'TEST.md')), 'utf8').catch(() => '')
		}))
	);
}

async function triggered(model: LanguageModel, test: AgentTest, path: string, content: string) {
	const triggers = Array.isArray(test.triggers) ? test.triggers : [test.triggers];
	for (const t of triggers) {
		let ok = true;
		for (const [attr, value] of [['path', path], ['content', content]] as const) {
			const filter = t[attr];
			if (!filter || !ok) continue;
			if (filter.match) {
				const pats = Array.isArray(filter.match) ? filter.match : [filter.match];
				ok = attr === 'path' ? picomatch.isMatch(value, pats, { dot: true }) : pats.some((p) => new RegExp(p, 'm').test(value));
			}
			if (ok && filter.ask) ok = (await classify(model, filter.ask, value)) >= 0.5;
		}
		if (ok) return true;
	}
	return false;
}

/** Stages escalate: fast decides when it hits; smart decides outside its bounds; deep decides the rest. */
async function runCheck(model: LanguageModel, test: AgentTest, check: Check, content: string): Promise<CheckResult> {
	const base = { test: test.id, check: check.id, message: check.message, fix: check.fix };
	const later = Boolean(check.smart || check.deep);
	if (check.fast) {
		const fast = new FastEngine();
		if (check.fast.match && (await fast.run(content, { patterns: check.fast.match })))
			return { ...base, outcome: 'fail', stage: 'fast', findings: fast.findings };
		const maybe = check.fast.maybe ? await fast.run(content, { patterns: check.fast.maybe }) : 1;
		if (!maybe || !later) return { ...base, outcome: 'pass', stage: 'fast', findings: [] };
	}
	if (check.smart) {
		const smart = new ModelEngine(model);
		const score = await smart.run(content, { ask: check.smart.ask });
		const [lower, upper] = check.smart.bounds ?? [0.35, 0.65];
		if (score < lower) return { ...base, outcome: 'pass', stage: 'smart', findings: [] };
		if (score > upper || !check.deep)
			return { ...base, outcome: score > upper ? 'fail' : 'unsure', stage: 'smart', findings: smart.findings };
	}
	const deep = new ModelEngine(model);
	const score = await deep.run(content, { ask: check.deep!.ask, reasoning: check.deep!.reasoning ?? 'high' });
	return { ...base, outcome: score >= 0.5 ? 'fail' : 'pass', stage: 'deep', findings: score >= 0.5 ? deep.findings : [] };
}

export async function runTest(model: LanguageModel, test: AgentTest, path: string, content: string): Promise<TestResult> {
	if (!(await triggered(model, test, path, content))) return { id: test.id, title: test.title, outcome: 'skip', checks: [] };
	const checks = await Promise.all(test.checks.map((c) => runCheck(model, test, c, content)));
	const outcome = checks.some((c) => c.outcome === 'fail') ? 'fail' : checks.some((c) => c.outcome === 'unsure') ? 'unsure' : 'pass';
	return { id: test.id, title: test.title, outcome, checks };
}

export async function runAll(model: LanguageModel, path: string, content: string) {
	const tests = await loadTests();
	return Promise.all(tests.map((t) => runTest(model, t, path, content)));
}
