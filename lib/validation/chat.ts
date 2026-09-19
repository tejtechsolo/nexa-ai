import { z } from 'zod';
import { isAllowedModel } from '@/lib/ai/models';

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(['send', 'regenerate']).default('send'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(100000),
  })).min(1).max(100),
  model: z.string().trim().min(1).max(100).refine(isAllowedModel, 'Unsupported model').optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;
