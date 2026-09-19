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

  const { conversationId, messages, action } = parsed.data;
  const model = parsed.data.model ?? DEFAULT_MODEL;

  const { data: conversation } = await supabase.from('conversations')
    .select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle();
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const lastMessage = messages[messages.length - 1];
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  if (action === 'send' && lastMessage?.role !== 'user') {
    return NextResponse.json({ error: 'A new request must end with a user message' }, { status: 400 });
  }
  if (action === 'regenerate' && lastMessage?.role === 'assistant') {
    return NextResponse.json({ error: 'Regenerate must exclude the previous assistant response' }, { status: 400 });
  }
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

  if (action === 'send') {
    const { error: userMessageError } = await supabase.from('messages').insert({
      conversation_id: conversationId, user_id: user.id, role: 'user', content: lastUserMessage.content,
    });
    if (userMessageError) {
      console.error('user_message_insert_error', userMessageError);
      return NextResponse.json({ error: 'Unable to save message' }, { status: 500 });
    }
  }

  try {
    const provider = createOpenAICompatibleProvider();
    const upstream = await provider.stream({
      messages, model, temperature: parsed.data.temperature, signal: request.signal,
    });
    const reader = upstream.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let finalized = false;

    async function finalizeAssistant() {
      if (finalized || !assistantText) return;
      finalized = true;

      if (action === 'regenerate') {
        const { data: previousAssistant } = await supabase.from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (previousAssistant) {
          const { error: deleteError } = await supabase.from('messages')
            .delete()
            .eq('id', previousAssistant.id)
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id);
          if (deleteError) console.error('regenerate_cleanup_error', deleteError);
        }
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId, user_id: user.id, role: 'assistant', content: assistantText,
      });
      if (error) console.error('assistant_message_insert_error', error);
      const { error: usageError } = await supabase.rpc('record_ai_output', {
        p_output_characters: assistantText.length,
      });
      if (usageError) console.error('usage_output_record_error', usageError);
    }

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            await finalizeAssistant();
            controller.close();
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
          controller.enqueue(new TextEncoder().encode(chunk));
        } catch (error) {
          await finalizeAssistant();
          console.error('chat_stream_error', error);
          controller.error(error);
        }
      },
      async cancel(reason) {
        await finalizeAssistant();
        await reader.cancel(reason);
      },
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
