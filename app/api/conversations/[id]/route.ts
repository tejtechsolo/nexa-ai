import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { id } = await context.params;

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id,title,provider,model,created_at,updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('conversation_get_error', error);
    return NextResponse.json({ error: 'Unable to load conversation' }, { status: 500 });
  }
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id,role,content,created_at')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (messagesError) {
    console.error('messages_get_error', messagesError);
    return NextResponse.json({ error: 'Unable to load messages' }, { status: 500 });
  }

  return NextResponse.json({ conversation, messages: messages ?? [] });
}

export async function PATCH(request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '';

  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id,title,provider,model,created_at,updated_at')
    .maybeSingle();

  if (error) {
    console.error('conversation_update_error', error);
    return NextResponse.json({ error: 'Unable to rename conversation' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  return NextResponse.json({ conversation: data });
}

export async function DELETE(_request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const { id } = await context.params;

  const { data, error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('conversation_delete_error', error);
    return NextResponse.json({ error: 'Unable to delete conversation' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
