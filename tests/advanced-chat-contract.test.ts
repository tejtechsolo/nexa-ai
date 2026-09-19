import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from '@/lib/validation/chat';

describe('advanced chat request contract', () => {
  it('accepts a normal send action', () => {
    const result = chatRequestSchema.safeParse({
      conversationId: '00000000-0000-0000-0000-000000000001',
      action: 'send',
      messages: [{ role: 'user', content: 'hello' }],
      model: 'gpt-4o-mini',
    });
    expect(result.success).toBe(true);
  });

  it('accepts regeneration history without an assistant tail', () => {
    const result = chatRequestSchema.safeParse({
      conversationId: '00000000-0000-0000-0000-000000000001',
      action: 'regenerate',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'previous answer' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown models', () => {
    const result = chatRequestSchema.safeParse({
      conversationId: '00000000-0000-0000-0000-000000000001',
      action: 'send',
      messages: [{ role: 'user', content: 'hello' }],
      model: 'not-a-real-model',
    });
    expect(result.success).toBe(false);
  });
});
