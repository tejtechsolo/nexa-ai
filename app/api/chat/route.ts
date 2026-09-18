import { NextResponse } from 'next/server';
import { createOpenAICompatibleProvider } from '@/lib/ai/openai-compatible';
import { chatRequestSchema } from '@/lib/validation/chat';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid chat request', issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const provider = createOpenAICompatibleProvider();
    const answer = await provider.chat(parsed.data);
    return NextResponse.json({ answer, provider: provider.id });
  } catch (error) {
    console.error('chat_api_error', error);
    return NextResponse.json({ error: 'Unable to complete the AI request' }, { status: 502 });
  }
}
