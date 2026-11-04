<script lang="ts">
	import { Button, Checkbox, Pill, Spinner, Surface, Tabs, TextArea, TextInput } from 'bref-ui';
	import type { Step } from '$lib/server/write';
	import type { Answer } from '$lib/server/visibility';

	let { data } = $props();

	let tab = $state('write');
	const tabs = [
		{ id: 'write', label: 'Write', icon: 'edit' },
		{ id: 'visibility', label: 'AI visibility', icon: 'manage_search' }
	] as const;

	// Write
	let topic = $state('');
	let url = $state('');
	let format = $state('linkedin-post');
	let research = $state(false);
	let steps = $state<Step[]>([]);
	let running = $state(false);
	let copied = $state(false);
	const done = $derived(steps.find((s) => s.step === 'done') as Extract<Step, { step: 'done' }> | undefined);
	const error = $derived(steps.find((s) => s.step === 'error') as Extract<Step, { step: 'error' }> | undefined);
	const lastCheck = $derived(steps.findLast((s) => s.step === 'check') as Extract<Step, { step: 'check' }> | undefined);

	const examples = [
		{ topic: 'Why AI writers invent numbers, and how to catch them', format: 'linkedin-post' },
		{ topic: 'Rules your posts must pass before they ship', format: 'x-post' },
		{ topic: 'How do I check if ChatGPT recommends my product?', format: 'seo-blog' }
	];

	async function run() {
		if (!topic.trim() || running) return;
		running = true;
		steps = [];
		copied = false;
		try {
			const res = await fetch('/api/write', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ topic, url: url.trim() || undefined, format, research })
			});
			const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
			let buf = '';
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buf += value;
				const lines = buf.split('\n');
				buf = lines.pop()!;
				for (const l of lines) if (l.trim()) steps = [...steps, JSON.parse(l)];
			}
		} catch (e) {
			steps = [...steps, { step: 'error', message: (e as Error).message }];
		}
		running = false;
	}

	const color = (o: string) => (o === 'pass' ? 'success' : o === 'fail' ? 'error' : o === 'unsure' ? 'warning' : 'muted');

	function label(s: Step) {
		switch (s.step) {
			case 'model': return `Model · ${s.detail}`;
			case 'context': return `Brand context · kept ${s.kept.length}, dropped ${s.dropped}`;
			case 'source': return `Read · ${s.title}`;
			case 'research': return `Web search · ${s.sources.length} sources`;
			case 'draft': return s.round === 1 ? 'Draft written' : 'Rewritten to pass checks';
			case 'check': return `Checks · ${s.results.filter((r) => r.outcome === 'pass').length}/${s.results.filter((r) => r.outcome !== 'skip').length} pass`;
			case 'done': return s.passed ? 'Ready' : 'Needs a human';
			case 'error': return `Error · ${s.message}`;
		}
	}

	async function copy() {
		if (!done) return;
		await navigator.clipboard.writeText(done.text);
		copied = true;
	}

	// Visibility
	let questions = $state(
		[
			data.category && `What are the best tools for ${data.category}?`,
			data.audience && `How should ${data.audience} keep people and AI agents working from the same information?`,
			`What is ${data.brand}?`
		]
			.filter(Boolean)
			.join('\n')
	);
	let vis = $state<{ engine: string; brand: string; answers: Answer[] } | null>(null);
	let visError = $state('');
	let visRunning = $state(false);
	const share = $derived(vis ? vis.answers.filter((a) => a.mentioned).length : 0);

	async function runVisibility() {
		visRunning = true;
		visError = '';
		vis = null;
		const res = await fetch('/api/visibility', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ questions: questions.split('\n') })
		});
		const body = await res.json();
		if (body.error) visError = body.error;
		else vis = body;
		visRunning = false;
	}
</script>

<svelte:head>
	<title>Bragger · brag, but check it first</title>
	<meta name="description" content="Write posts from your own brand files, check them with agent tests, and see whether AI assistants name you. Open source." />
</svelte:head>

<main>
	<header>
		<h1>Write it. Check it. Ship it.</h1>
		<p class="lede">Posts from your own brand files, checked by your rules before you publish.</p>
	</header>

	<Tabs items={tabs} value={tab} onChange={(id) => (tab = id)} label="Mode" />

	{#if tab === 'write'}
		<section class="grid">
			<Surface variant="soft" spacing="large" radius="medium" orientation="vertical">
				<label for="topic">Topic</label>
				<TextArea id="topic" rows={3} wide value={topic} onChange={(v) => (topic = v)} placeholder="What should the post say?" />

				<label for="url">Source URL <span class="opt">optional</span></label>
				<TextInput id="url" wide value={url} onChange={(v) => (url = v)} placeholder="https://…" />

				<span class="label">Format</span>
				<div class="row">
					{#each data.formats as f (f.id)}
						<Button label={f.title} size="small" variant={format === f.id ? 'filled' : 'neutral'} onClick={() => (format = f.id)} />
					{/each}
				</div>

				<label class="check"><Checkbox checked={research} onchange={(e) => (research = e.currentTarget.checked)} /> Search the web for facts</label>

				<div class="row">
					<Button label={running ? 'Writing…' : 'Write'} trailingIcon={{ name: 'arrow_forward' }} disabled={running || !topic.trim()} onClick={run} />
				</div>
				<div class="row">
					<span class="opt">Try:</span>
					{#each examples as ex (ex.topic)}
						<Button label={ex.topic} size="x-small" variant="soft" color="muted" onClick={() => { topic = ex.topic; format = ex.format; }} />
					{/each}
				</div>
				<p class="fine">Runs on your machine with your API key. Nothing is stored.</p>
			</Surface>

			<div class="out">
				{#if steps.length}
					<ol class="steps">
						{#each steps.filter((s) => s.step !== 'done') as s, i (i)}
							<li class:err={s.step === 'error'}>{label(s)}</li>
						{/each}
						{#if running}<li class="live"><Spinner size="x-small" /> working</li>{/if}
					</ol>
				{/if}

				{#if error}
					<Surface variant="soft" color="error" spacing="medium" radius="medium"><p>{error.message}</p></Surface>
				{/if}

				{#if done}
					<Surface variant="neutral" spacing="large" radius="medium" orientation="vertical">
						<div class="verdict">
							<Pill label={done.passed ? 'All checks pass' : 'Needs a human'} color={done.passed ? 'success' : 'warning'} size="small" />
							<code>{done.path}</code>
							<span class="grow"></span>
							<Button label={copied ? 'Copied' : 'Copy'} size="small" variant="soft" icon={{ name: copied ? 'check' : 'content_copy' }} onClick={copy} />
						</div>
						<pre class="post">{done.text}</pre>
					</Surface>
				{/if}

				{#if lastCheck}
					<h2>Checks</h2>
					<ul class="tests">
						{#each lastCheck.results as t (t.id)}
							<li>
								<Pill label={t.outcome} color={color(t.outcome)} size="x-small" />
								<strong>{t.title}</strong>
								{#each t.checks.filter((c) => c.outcome !== 'pass') as c (c.check)}
									<p class="finding">{c.message} <span class="opt">({c.stage})</span></p>
									{#each c.findings as f}<blockquote>“{f.quote}”{#if f.note} · {f.note}{/if}</blockquote>{/each}
									<p class="fix">Fix: {c.fix}</p>
								{/each}
							</li>
						{/each}
					</ul>
					{#if steps.some((s) => s.step === 'check' && s.round === 2)}
						<p class="fine">First draft failed a check, so the writer got the quotes and fixes and tried once more.</p>
					{/if}
				{/if}

				{#if !steps.length}
					<div class="empty">
						<h2>Your rules</h2>
						<ul class="tests">
							{#each data.tests as t (t.id)}
								<li><strong>{t.title}</strong> <span class="opt">{t.description}</span></li>
							{/each}
						</ul>
						<p class="fine">Edit <code>.agents/tests/</code> to add rules, <code>brand/</code> to change what the writer knows.</p>
					</div>
				{/if}
			</div>
		</section>
	{:else}
		<section class="grid">
			<Surface variant="soft" spacing="large" radius="medium" orientation="vertical">
				<label for="q">Questions buyers ask <span class="opt">one per line, up to 8</span></label>
				<TextArea id="q" rows={6} wide value={questions} onChange={(v) => (questions = v)} />
				<div class="row">
					<Button label={visRunning ? 'Asking…' : 'Ask'} trailingIcon={{ name: 'arrow_forward' }} disabled={visRunning} onClick={runVisibility} />
				</div>
				<p class="fine">Asks your model with web search on. One run is one sample: answers change from run to run.</p>
			</Surface>

			<div class="out">
				{#if visRunning}<p class="live"><Spinner size="x-small" /> asking</p>{/if}
				{#if visError}<Surface variant="soft" color="error" spacing="medium" radius="medium"><p>{visError}</p></Surface>{/if}
				{#if vis}
					<h2 class="big">{vis.brand} named in {share} of {vis.answers.length}</h2>
					<p class="opt">{vis.engine}</p>
					<ul class="tests">
						{#each vis.answers as a (a.question)}
							<li>
								<Pill label={a.mentioned ? (a.rank ? `#${a.rank}` : 'named') : 'absent'} color={a.mentioned ? 'success' : 'warning'} size="x-small" />
								<strong>{a.question}</strong>
								{#if a.quote}<blockquote>“{a.quote}”</blockquote>{/if}
								{#if a.named.length}<p class="opt">Named: {a.named.slice(0, 6).join(', ')}</p>{/if}
								{#if a.sources.length}
									<p class="opt">Sources: {#each a.sources.slice(0, 4) as s, i}{#if i}{', '}{/if}<a href={s} target="_blank" rel="noreferrer">{new URL(s).hostname}</a>{/each}</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	{/if}

	<footer>
		<p>Open source. Built on <a href="https://github.com/feuersteiner/contextrie">Contextrie</a>, <a href="https://github.com/feuersteiner/agent-tests">agent-tests</a>, <a href="https://github.com/feuersteiner/agent-snippets">agent-snippets</a>, <a href="https://github.com/feuersteiner/typemark">Typemark</a> and <a href="https://github.com/feuersteiner/bref-ui">Bref UI</a>.</p>
	</footer>
</main>

<style>
	main { max-width: 72rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; display: flex; flex-direction: column; gap: 1.5rem; }
	h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 300; letter-spacing: -0.03em; margin: 0; }
	.lede { margin: 0.5rem 0 0; opacity: 0.75; font-size: 1.1rem; }
	.grid { display: grid; grid-template-columns: minmax(0, 26rem) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
	@media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
	label, .label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
	.check { text-transform: none; letter-spacing: 0; font-weight: 400; font-size: 0.95rem; display: flex; gap: 0.5rem; align-items: center; }
	.row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
	.opt { font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 0.6; font-size: 0.85rem; }
	.fine { font-size: 0.8rem; opacity: 0.6; margin: 0; }
	.out { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
	.steps { margin: 0; padding-left: 1.2rem; font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.25rem; font-family: ui-monospace, monospace; }
	.steps .err { color: var(--color-error, #c33); }
	.live { display: flex; gap: 0.5rem; align-items: center; list-style: none; margin-left: -1.2rem; opacity: 0.7; }
	.verdict { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
	.grow { flex: 1; }
	.post { white-space: pre-wrap; font-family: inherit; font-size: 1rem; line-height: 1.55; margin: 0; }
	h2 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; margin: 0.5rem 0 0; }
	h2.big { font-size: 1.6rem; text-transform: none; letter-spacing: -0.02em; font-weight: 400; }
	.tests { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.9rem; }
	.tests li { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start; }
	blockquote { margin: 0; padding-left: 0.75rem; border-left: 2px solid currentColor; opacity: 0.8; font-size: 0.9rem; }
	.finding, .fix { margin: 0; font-size: 0.9rem; }
	.fix { opacity: 0.7; }
	footer { margin-top: 2rem; font-size: 0.85rem; opacity: 0.65; }
	a { color: inherit; }
</style>
