import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as { messageId?: string } | null;
  if (!body?.messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 });

  const { data: target } = await supabase.from('messages')
    .select('id, created_at')
    .eq('id', body.messageId)
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const { error } = await supabase.from('messages')
    .delete()
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .gte('created_at', target.created_at);

  if (error) {
    console.error('rewind_messages_error', error);
    return NextResponse.json({ error: 'Unable to edit conversation history' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
