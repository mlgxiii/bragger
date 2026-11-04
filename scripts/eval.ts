// Runs every test's labelled evals: `npm test`, or `npm test -- no-hype-words`.
import { loadTests, runTest } from '../src/lib/server/tests';
import { pickModel } from '../src/lib/server/model';

const only = process.argv[2];
const tests = (await loadTests()).filter((t) => !only || t.id === only);
const needsModel = tests.some((t) => t.checks.some((c) => c.smart || c.deep) || [t.triggers].flat().some((tr) => tr.content?.ask));
const model = needsModel ? pickModel().model : (undefined as never);
let failed = 0;
for (const test of tests) {
	for (const e of test.evals) {
		const got = (await runTest(model, test, e.path, e.content)).outcome;
		const ok = got === e.expect;
		if (!ok) failed++;
		console.log(`${ok ? '✓' : '✗'} ${test.id} · ${e.name}: expected ${e.expect}, got ${got}`);
	}
}
console.log(failed ? `\n${failed} eval(s) failed` : '\nAll evals pass');
process.exit(failed ? 1 : 0);
