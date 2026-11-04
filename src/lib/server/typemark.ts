/**
 * The smallest useful slice of Typemark (github.com/feuersteiner/typemark):
 * `@key: value` lines right under a heading are that section's properties.
 * Typemark has no published parser yet; replace this when it does.
 */
export type Section = { title: string; depth: number; props: Record<string, string>; body: string };

export function parseTypemark(text: string): Section[] {
	const sections: Section[] = [];
	let current: Section = { title: '', depth: 0, props: {}, body: '' };
	for (const line of text.split('\n')) {
		const heading = line.match(/^(#{1,6})\s+(.*)$/);
		const prop = line.match(/^@([\w-]+):\s*(.*)$/);
		if (heading) {
			sections.push(current);
			current = { title: heading[2].trim(), depth: heading[1].length, props: {}, body: '' };
		} else if (prop && !current.body.trim()) current.props[prop[1]] = prop[2].trim();
		else current.body += line + '\n';
	}
	sections.push(current);
	return sections.filter((s) => s.title || s.body.trim() || Object.keys(s.props).length);
}

/** Properties of the first section that has them (the document's front matter). */
export function docProps(text: string) {
	return parseTypemark(text).find((s) => Object.keys(s.props).length)?.props ?? {};
}
