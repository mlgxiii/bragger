// npm run write -- "topic" [--format linkedin-post] [--url https://…] [--research]
import { write } from '../src/lib/server/write';

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const format = flag('format') ?? 'linkedin-post';
const url = flag('url');
const research = args.includes('--research') && Boolean(args.splice(args.indexOf('--research'), 1));
const topic = args.join(' ');
if (!topic) { console.error('Usage: npm run write -- "topic" [--format x-post] [--url …] [--research]'); process.exit(1); }

for await (const s of write({ topic, url, format, research })) {
	if (s.step === 'model') console.log(`model     ${s.detail}`);
	if (s.step === 'context') console.log(`context   kept ${s.kept.length}, dropped ${s.dropped}: ${s.kept.map((k) => k.id).join(', ')}`);
	if (s.step === 'source') console.log(`source    ${s.title} (${s.chars} chars)`);
	if (s.step === 'research') console.log(`research  ${s.sources.length} sources`);
	if (s.step === 'check')
		for (const t of s.results) {
			console.log(`check ${s.round}   ${t.outcome.padEnd(6)} ${t.title}`);
			for (const c of t.checks.filter((c) => c.outcome !== 'pass')) console.log(`            ${c.message} ${c.findings.map((f) => `"${f.quote}"`).join(', ')}`);
		}
	if (s.step === 'done') console.log(`\n${s.passed ? 'PASSED' : 'NEEDS A HUMAN'} → ${s.path}\n\n${s.text}`);
}
