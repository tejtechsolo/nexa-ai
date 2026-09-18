import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DAILY_REQUEST_LIMIT } from '@/lib/ai/models';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data } = await supabase
    .from('ai_usage_daily')
    .select('request_count,input_characters,output_characters,usage_date')
    .eq('user_id', user.id)
    .eq('usage_date', new Date().toISOString().slice(0, 10))
    .maybeSingle();

  const requestCount = data?.request_count ?? 0;
  return NextResponse.json({
    usage: data ?? { request_count: 0, input_characters: 0, output_characters: 0 },
    dailyLimit: DAILY_REQUEST_LIMIT,
    remaining: Math.max(DAILY_REQUEST_LIMIT - requestCount, 0),
  });
}
