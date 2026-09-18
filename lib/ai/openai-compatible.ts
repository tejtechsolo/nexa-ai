import type { AIProvider, ChatRequest } from './types';

export function createOpenAICompatibleProvider(): AIProvider {
  return {
    id: 'openai',
    name: 'OpenAI',
    async chat(input: ChatRequest) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model || 'gpt-4o-mini',
          messages: input.messages,
          temperature: input.temperature ?? 0.7,
        }),
        cache: 'no-store',
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`AI provider request failed (${response.status}): ${detail.slice(0, 500)}`);
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('AI provider returned an empty response');
      return content;
    },
  };
}
