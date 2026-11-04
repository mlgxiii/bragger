import { loadFormats } from '$lib/server/formats';
import { loadTests } from '$lib/server/tests';
import { brandProfile } from '$lib/server/visibility';

export async function load() {
	const [formats, tests, profile] = await Promise.all([loadFormats(), loadTests(), brandProfile()]);
	return {
		formats: formats.map(({ id, title }) => ({ id, title })),
		tests: tests.map(({ id, title, description }) => ({ id, title, description })),
		brand: profile.name ?? 'your brand',
		audience: profile.audience ?? '',
		category: profile.category ?? ''
	};
}
