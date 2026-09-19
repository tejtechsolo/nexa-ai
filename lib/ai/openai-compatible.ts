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
        signal: input.signal,
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
        signal: input.signal,
      });

      if (!response.ok || !response.body) {
        const detail = await response.text();
        throw new Error(`AI stream request failed (${response.status}): ${detail.slice(0, 500)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      return new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              buffer += decoder.decode();
              processBuffer(controller, true);
              if (controller.desiredSize !== null) controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            processBuffer(controller, false);
          } catch (error) {
            controller.error(error);
          }
        },
        async cancel(reason) {
          await reader.cancel(reason);
        },
      });

      function processBuffer(controller: ReadableStreamDefaultController<Uint8Array>, final: boolean) {
        const events = buffer.split(/\r?\n\r?\n/);
        if (!final) buffer = events.pop() ?? '';
        else buffer = '';

        for (const event of events) {
          const dataLines = event.split(/\r?\n/).filter((line) => line.startsWith('data:'));
          if (!dataLines.length) continue;
          const payload = dataLines.map((line) => line.slice(5).trimStart()).join('\n').trim();
          if (!payload) continue;
          if (payload === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string | null } }> };
            const content = json.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          } catch {
            // Preserve malformed/partial upstream data without exposing it to the client.
          }
        }
      }
    },
  };
}
