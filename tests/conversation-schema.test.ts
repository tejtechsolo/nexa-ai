import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from '@/lib/validation/chat';

describe('persistent chat contracts', () => {
  it('accepts a normal multi-turn message history', () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'Explain Supabase RLS' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty messages', () => {
    const result = chatRequestSchema.safeParse({ messages: [{ role: 'user', content: '   ' }] });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported roles', () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: 'developer', content: 'test' }],
    });
    expect(result.success).toBe(false);
  });
});
