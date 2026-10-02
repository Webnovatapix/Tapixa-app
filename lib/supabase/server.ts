import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SUPABASE_URL = "https://lygyoqdygyardxvuhifu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Z3lvcWR5Z3lhcmR4dnVoaWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjgyNjksImV4cCI6MjEwNjEwNDI2OX0.R_HKh-w04sZl-KZPNUnN1aOq4YgoNBQVyNcbPP1uts4";

/**
 * Server-side client bound to the request's auth cookies.
 * Use in server actions and route handlers to identify the caller.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore: middleware refreshes the session.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. BYPASSES RLS. Server only, never import from a
 * client component, and never expose SUPABASE_SERVICE_ROLE_KEY with a
 * NEXT_PUBLIC_ prefix.
 */
export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
