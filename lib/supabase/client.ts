import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (anon key + the signed-in user's session).
 * Row Level Security decides what this client can read or change.
 */
export function createClient() {
  return createBrowserClient(
    "https://lygyoqdygyardxvuhifu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Z3lvcWR5Z3lhcmR4dnVoaWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjgyNjksImV4cCI6MjEwNjEwNDI2OX0.R_HKh-w04sZl-KZPNUnN1aOq4YgoNBQVyNcbPP1uts4"
  );
}
