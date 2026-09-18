import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data, error } = await supabase
    .from('conversations')
    .select('id,title,provider,model,created_at,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('conversations_list_error', error);
    return NextResponse.json({ error: 'Unable to load conversations' }, { status: 500 });
  }
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : 'New conversation';

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title: title || 'New conversation' })
    .select('id,title,provider,model,created_at,updated_at')
    .single();

  if (error) {
    console.error('conversation_create_error', error);
    return NextResponse.json({ error: 'Unable to create conversation' }, { status: 500 });
  }
  return NextResponse.json({ conversation: data }, { status: 201 });
}
