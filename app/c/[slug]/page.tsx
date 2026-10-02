export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CardRedirectPage({ params }: PageProps) {
  const { slug } = await params;

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

  if (error || !card) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2>Card Not Found</h2>
        <p>Database me "{slug}" ka record nahi mila.</p>
      </div>
    );
  }

  // 2. Increment tap count in background
  try {
    await supabase
      .from('cards')
      .update({ tap_count: (card.tap_count || 0) + 1 })
      .eq('id', card.id);
  } catch (e) {
    console.error('Failed to update tap count:', e);
  }

  // 3. Redirect if URL exists
  if (card.destination_url) {
    let finalUrl = card.destination_url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    redirect(finalUrl);
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h2>Card is Active</h2>
      <p>Lekin is card par koi destination URL set nahi hai.</p>
    </div>
  );
}
