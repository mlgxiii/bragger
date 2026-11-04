import { json } from '@sveltejs/kit';
import { visibility } from '$lib/server/visibility';

export async function POST({ request }) {
	const { questions } = (await request.json()) as { questions: string[] };
	const list = questions.map((q) => q.trim()).filter(Boolean).slice(0, 8);
	try {
		return json(await visibility(list));
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
}
