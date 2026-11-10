import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateSameOrigin } from '@/lib/security/request-guard';

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
