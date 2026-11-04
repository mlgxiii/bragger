import { readTree } from './files';
import { docProps } from './typemark';

/**
 * Formats are agent snippets (github.com/feuersteiner/agent-snippets): one SNIPPET.md per format,
 * in plain prose. Typemark properties on top give the format its name and output path.
 * agent-snippets has no runner yet, so the prose is handed to the writer as instructions.
 */
export type Format = { id: string; title: string; output: string; instructions: string };

export async function loadFormats(): Promise<Format[]> {
	const files = await readTree('.agents/snippets');
	return files
		.filter((f) => f.path.endsWith('SNIPPET.md'))
		.map((f) => {
			const id = f.path.split('/').at(-2)!;
			const props = docProps(f.text);
			return {
				id,
				title: props.title ?? id,
				output: props.output ?? `out/${id}.md`,
				instructions: f.text.replace(/^@[\w-]+:.*$/gm, '').trim()
			};
		});
}
