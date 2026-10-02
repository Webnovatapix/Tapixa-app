export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export default async function CardRedirectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  if (!slug) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
        <h2>Slug missing in request</h2>
      </div>
    );
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

  if (error) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
        <h2>Supabase Query Error:</h2>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
        <h2>Card Not Found:</h2>
        <p>Database me slug &quot;{slug}&quot; ka koi record nahi mila.</p>
      </div>
    );
  }

  if (!card.destination_url) {
    return (
      <div style={{ padding: 20, fontFamily: 'sans-serif', background: '#fff', color: '#000' }}>
        <h2>Destination URL Missing:</h2>
        <p>Card mil gaya par destination_url empty hai.</p>
      </div>
    );
  }

  // 2. Increment tap count in background
  supabase
    .from('cards')
    .update({ tap_count: (card.tap_count || 0) + 1 })
    .eq('id', card.id)
    .then();

  let finalUrl = card.destination_url.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}`;
  }

  redirect(finalUrl);
}
