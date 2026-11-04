import { write, type WriteInput } from '$lib/server/write';

/** Streams pipeline steps as newline-delimited JSON. */
export async function POST({ request }) {
	const input = (await request.json()) as WriteInput;
	const stream = new ReadableStream({
		async start(c) {
			const send = (o: unknown) => c.enqueue(new TextEncoder().encode(JSON.stringify(o) + '\n'));
			try {
				for await (const step of write(input)) send(step);
			} catch (e) {
				send({ step: 'error', message: (e as Error).message });
			}
			c.close();
		}
	});
	return new Response(stream, { headers: { 'content-type': 'application/x-ndjson' } });
}
