import { NextResponse } from 'next/server';
import { createOpenAICompatibleProvider } from '@/lib/ai/openai-compatible';
import { chatRequestSchema } from '@/lib/validation/chat';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : null;
  if (!conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid chat request', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const lastUserMessage = [...parsed.data.messages].reverse().find((message) => message.role === 'user');
  if (!lastUserMessage) return NextResponse.json({ error: 'A user message is required' }, { status: 400 });

  const { error: userMessageError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'user',
    content: lastUserMessage.content,
  });
  if (userMessageError) {
    console.error('user_message_insert_error', userMessageError);
    return NextResponse.json({ error: 'Unable to save message' }, { status: 500 });
  }

  try {
    const provider = createOpenAICompatibleProvider();
    const answer = await provider.chat(parsed.data);
    const { error: assistantMessageError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'assistant',
      content: answer,
    });

    if (assistantMessageError) {
      console.error('assistant_message_insert_error', assistantMessageError);
      return NextResponse.json({ error: 'AI response generated but could not be saved' }, { status: 500 });
    }

    return NextResponse.json({ answer, provider: provider.id });
  } catch (error) {
    console.error('chat_api_error', error);
    return NextResponse.json({ error: 'Unable to complete the AI request' }, { status: 502 });
  }
}
