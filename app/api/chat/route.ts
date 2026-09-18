import { NextResponse } from 'next/server';
import { createOpenAICompatibleProvider } from '@/lib/ai/openai-compatible';
import { chatRequestSchema } from '@/lib/validation/chat';
import { createClient } from '@/lib/supabase/server';
import { DAILY_REQUEST_LIMIT, DEFAULT_MODEL } from '@/lib/ai/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid chat request', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { conversationId, messages } = parsed.data;
  const model = parsed.data.model ?? DEFAULT_MODEL;

  const { data: conversation } = await supabase.from('conversations')
    .select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle();
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUserMessage) return NextResponse.json({ error: 'A user message is required' }, { status: 400 });

  const inputCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  const { data: quota, error: quotaError } = await supabase.rpc('consume_ai_request', {
    p_input_characters: inputCharacters,
    p_daily_limit: DAILY_REQUEST_LIMIT,
  });

  if (quotaError) {
    console.error('usage_quota_error', quotaError);
    return NextResponse.json({ error: 'Unable to verify usage quota' }, { status: 503 });
  }

  const quotaResult = Array.isArray(quota) ? quota[0] : quota;
  if (!quotaResult?.allowed) {
    return NextResponse.json({
      error: 'Daily AI request limit reached',
      remaining: 0,
      dailyLimit: DAILY_REQUEST_LIMIT,
    }, { status: 429, headers: { 'retry-after': '86400' } });
  }

  const { error: userMessageError } = await supabase.from('messages').insert({
    conversation_id: conversationId, user_id: user.id, role: 'user', content: lastUserMessage.content,
  });
  if (userMessageError) {
    console.error('user_message_insert_error', userMessageError);
    return NextResponse.json({ error: 'Unable to save message' }, { status: 500 });
  }

  try {
    const provider = createOpenAICompatibleProvider();
    const upstream = await provider.stream({ messages, model, temperature: parsed.data.temperature });
    const reader = upstream.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            if (assistantText) {
              const { error } = await supabase.from('messages').insert({
                conversation_id: conversationId, user_id: user.id, role: 'assistant', content: assistantText,
              });
              if (error) console.error('assistant_message_insert_error', error);
              const { error: usageError } = await supabase.rpc('record_ai_output', {
                p_output_characters: assistantText.length,
              });
              if (usageError) console.error('usage_output_record_error', usageError);
            }
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          controller.enqueue(new TextEncoder().encode(chunk));
        } catch (error) {
          console.error('chat_stream_error', error);
          controller.error(error);
        }
      },
      async cancel() { await reader.cancel(); },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-nexa-provider': provider.id,
        'x-nexa-model': model,
        'x-nexa-remaining': String(quotaResult.remaining ?? 0),
      },
    });
  } catch (error) {
    console.error('chat_api_error', error);
    return NextResponse.json({ error: 'Unable to complete the AI request' }, { status: 502 });
  }
}
