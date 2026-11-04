/** Fetch a page and keep its readable text. No headless browser: pages rendered only by JavaScript come back thin. */
export async function readUrl(url: string) {
	const res = await fetch(url, {
		headers: { 'user-agent': 'Bragger/0.1 (+https://github.com/mlgxiii/bragger)' },
		signal: AbortSignal.timeout(15000)
	});
	if (!res.ok) throw new Error(`${url} answered ${res.status}`);
	const html = await res.text();
	const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? url;
	const text = html
		.replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
	return { title, text: text.slice(0, 12000) };
}
