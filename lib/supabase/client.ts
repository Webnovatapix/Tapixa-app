import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (anon key + the signed-in user's session).
 * Row Level Security decides what this client can read or change.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
