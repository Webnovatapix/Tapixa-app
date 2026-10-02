export const runtime = 'edge'; 
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';

export default async function CardRedirectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  if (!slug) {
    notFound();
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://lygyoqdygyardxvuhifu.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_F9hdKS-Q5f-D0bkUpC7w2g_E00xhiQp';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch card details
  const { data: card, error } = await supabase
    .from('cards')
    .select('id, destination_url, tap_count')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !card || !card.destination_url) {
    notFound();
  }

  // 2. Increment tap count in background
  supabase
    .from('cards')
    .update({ tap_count: (card.tap_count || 0) + 1 })
    .eq('id', card.id)
    .then();

  // 3. Format URL & Direct Redirect
  let finalUrl = card.destination_url.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}`;
  }

  redirect(finalUrl);
}
