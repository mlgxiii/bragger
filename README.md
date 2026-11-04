# Bragger

Brag, but check it first. Write posts from your own brand files. Check them against your rules before they ship. See whether AI assistants name you.

An open-source take on the AI marketing workspace, built on the [feuersteiner](https://github.com/feuersteiner) packages:

| Piece | Package | Where |
| --- | --- | --- |
| Pick the brand facts a post needs | [Contextrie](https://github.com/feuersteiner/contextrie) (`@contextrie/core`) | `src/lib/server/context.ts` |
| Rules every post must pass | [agent-tests](https://github.com/feuersteiner/agent-tests) (`test.yaml` format, vendored core) | `.agents/tests/`, `src/lib/server/tests.ts` |
| Formats (LinkedIn, X, SEO blog) | [agent-snippets](https://github.com/feuersteiner/agent-snippets) (`SNIPPET.md`) | `.agents/snippets/` |
| Brand files with properties | [Typemark](https://github.com/feuersteiner/typemark) (`@key: value`) | `brand/` |
| Interface | [Bref UI](https://github.com/feuersteiner/bref-ui) | `src/routes/` |

## Run

Needs Node 22+ and an Anthropic or OpenAI API key.

```sh
git clone https://github.com/mlgxiii/bragger && cd bragger
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY or OPENAI_API_KEY
npm run dev                 # http://localhost:5173
```

From the terminal:

```sh
npm run write -- "Rules your posts must pass before they ship" --format x-post
npm run write -- "How do I check if ChatGPT recommends my product?" --format seo-blog --research
npm run write -- "Our launch" --url https://example.com/changelog
npm test                    # runs every test's labelled evals
```

## How a post is made

1. **Context.** Each `brand/` section becomes a Contextrie source. The judge scores it against the task; the composer keeps what matters.
2. **Source.** Optional URL, fetched and stripped to text.
3. **Research.** Optional web search through your model provider. Sources are kept.
4. **Draft.** Format instructions come from the snippet.
5. **Check.** Every `.agents/tests/*/test.yaml` runs on the draft as if it were the file `out/<format>.md`. `fast` is regex, `smart` and `deep` ask the model, which must quote what breaks the rule.
6. **Fix once.** Failed checks, their quotes and fixes go back to the writer. If it still fails, the result says **Needs a human**.

## AI visibility

Asks your model, with web search on, the questions your buyers ask, then reports whether your brand (`@name`, `@aliases`, `@domain` in `brand/`) is named, its rank among the named products, the sentence that names it, and the sources. One run is one sample; answers change between runs.

## Make it yours

- Replace `brand/*.md` with your company. The files there describe Bragger itself, as an example.
- Add a rule: `.agents/tests/<id>/TEST.md` (the rule in prose) and `test.yaml` (what runs), with evals. `npm test` checks them.
- Add a format: `.agents/snippets/<id>/SNIPPET.md` with `@title:` and `@output:`.

## Not built yet

Lead finding, outreach and meeting booking (they need data providers and mailbox access), rank tracking, social analytics, and scheduled publishing.

## License

MIT. `vendor/agent-tests/` is MIT, © 2026 Feuerstein; see its README.
