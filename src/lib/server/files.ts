import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/** Project root: brand/, .agents/tests/ and .agents/snippets/ live here. BRAGGER_ROOT overrides it. */
export const ROOT = resolve(process.env.BRAGGER_ROOT ?? process.cwd());

export async function readTree(dir: string, ext = '.md'): Promise<{ path: string; text: string }[]> {
	const abs = join(ROOT, dir);
	const entries = await readdir(abs, { recursive: true }).catch(() => [] as string[]);
	const files = entries.filter((e) => e.endsWith(ext)).sort();
	return Promise.all(files.map(async (f) => ({ path: join(dir, f), text: await readFile(join(abs, f), 'utf8') })));
}
