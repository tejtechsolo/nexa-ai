import { z } from 'zod';

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(100000),
  })).min(1).max(100),
  model: z.string().trim().min(1).max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;
