export const runtime = 'edge';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/url';

/**
 * Landing point for the confirmation link in signup emails.
 * Exchanges the one-time code for a session cookie, then returns the user
 * to where they started (for example /activate?card=k8f9a2m1).
 *
 * Add <your-origin>/auth/callback to Supabase > Auth > URL Configuration >
 * Redirect URLs, or the email link will be rejected.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/activate?error=confirmation_failed`);
}
