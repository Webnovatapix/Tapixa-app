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

  const supabaseUrl = 'https://lygyoqdygyardxvuhifu.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5Z3lvcWR5Z3lhcmR4dnVoaWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjgyNjksImV4cCI6MjEwNjEwNDI2OX0.R_HKh-w04sZl-KZPNUnN1aOq4YgoNBQVyNcbPP1uts4';

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
