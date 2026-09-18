import type { AIProvider, ChatRequest } from './types';

const encoder = new TextEncoder();

export function createOpenAICompatibleProvider(): AIProvider {
  return {
    id: 'openai',
    name: 'OpenAI',
    async chat(input: ChatRequest) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
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

    async stream(input: ChatRequest) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: input.model || 'gpt-4o-mini',
          messages: input.messages,
          temperature: input.temperature ?? 0.7,
          stream: true,
        }),
        cache: 'no-store',
      });

      if (!response.ok || !response.body) {
        const detail = await response.text();
        throw new Error(`AI stream request failed (${response.status}): ${detail.slice(0, 500)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      return new ReadableStream<Uint8Array>({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          const text = decoder.decode(value, { stream: true });
          const lines = text.split(/\r?\n/);
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
              const content = json.choices?.[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(content));
            } catch {
              // Ignore incomplete SSE frames; the upstream reader will deliver subsequent bytes.
            }
          }
        },
        async cancel() {
          await reader.cancel();
        },
      });
    },
  };
}
