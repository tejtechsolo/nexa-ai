import { z } from 'zod';
import { isAllowedModel } from '@/lib/ai/models';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(20000),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(['send', 'regenerate']).default('send'),
  messages: z.array(messageSchema).min(1).max(40)
    .refine((messages) => messages[messages.length - 1]?.role !== 'assistant' || messages.length > 1,
      'Invalid conversation history')
    .refine((messages) => messages.reduce((sum, message) => sum + message.content.length, 0) <= 80000,
      'Conversation context exceeds the allowed size'),
  model: z.string().trim().min(1).max(100).refine(isAllowedModel, 'Unsupported model').optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;
