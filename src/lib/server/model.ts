import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel, ToolSet } from 'ai';

/** Anthropic if its key is set, otherwise OpenAI. MODEL overrides the default. */
export function pickModel() {
	const { ANTHROPIC_API_KEY, OPENAI_API_KEY, MODEL } = process.env;
	if (ANTHROPIC_API_KEY) {
		const id = MODEL || 'claude-sonnet-5-5';
		return {
			provider: 'anthropic' as const,
			id,
			model: anthropic(id) as LanguageModel,
			search: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 3 }) } as ToolSet
		};
	}
	if (OPENAI_API_KEY) {
		const id = MODEL || 'gpt-4.1-mini';
		return {
			provider: 'openai' as const,
			id,
			model: openai(id) as LanguageModel,
			search: { web_search: openai.tools.webSearch({}) } as ToolSet
		};
	}
	throw new Error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env');
}
