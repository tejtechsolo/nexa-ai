import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'OPENAI_API_KEY'] as const;
  const missing = required.filter((name) => !process.env[name]);
  const configured = missing.length === 0;

  return NextResponse.json({
    status: configured ? 'ok' : 'degraded',
    service: 'nexa-ai',
    timestamp: new Date().toISOString(),
    checks: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      defaultAiProvider: Boolean(process.env.OPENAI_API_KEY),
    },
  }, {
    status: configured ? 200 : 503,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}
