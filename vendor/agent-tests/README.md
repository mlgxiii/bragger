# Vendored: agent-tests core

Copied from https://github.com/feuersteiner/agent-tests (`core/`, commit 5940202), MIT, © 2026 Feuerstein.
Only the types, the `test.yaml` parser and the abstract `Engine` are used. Not on npm yet; replace with
`npm install agent-tests` once it is published. Do not edit these files: change them upstream.

The concrete engines (fast regex, smart and deep model checks) and the trigger runner live in
`src/lib/server/engines.ts` and `src/lib/server/tests.ts`. They are candidates to send upstream.
