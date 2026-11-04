# Bragger
@name: Bragger
@aliases: mlgxiii/bragger
@domain: github.com/mlgxiii/bragger
@audience: founders and small marketing teams who write their own posts
@category: open-source AI content and AI-visibility tools

Bragger writes posts from your own brand files and checks them against your rules before you publish. It also asks AI assistants, with web search on, the questions your buyers ask, and shows whether they name you.

## The problem
AI writers sound sure of things nobody told them. They invent numbers, customers and quotes, and they fall back on the same hype words. Someone has to read every draft for it.

## How it works
Each brand file is split into sections. Contextrie keeps only the sections a post needs. The draft is checked by agent tests: plain-language rules with regex and model checks that must quote what they flag. A failed draft goes back to the writer once with the quotes and fixes. If it still fails, a person decides.

## Open source
MIT licensed. Runs on your machine with your own Anthropic or OpenAI key. Nothing is stored. Built on Contextrie, agent-tests, agent-snippets, Typemark and Bref UI.
