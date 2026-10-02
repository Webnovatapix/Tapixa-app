export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Configuration Error</h2>
        <p>Supabase Environment Variables not found in Cloudflare.</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Database se card fetch karo
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // Agar card database me nahi mila ya error aaya
  if (error || !card) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ background: '#ffffff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '420px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Card Not Found</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
            Database me slug: <b>"{slug}"</b> nahi mila.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '12px' }}>
            Supabase table 'cards' me check karein ki slug sahi dala hai ya nahi.
          </p>
        </div>
      </div>
    );
  }

  // Tap count increase karo
  await supabase
    .from('cards')
    .update({ tap_count: (card.tap_count || 0) + 1 })
    .eq('id', card.id);

  // Agar destination_url set hai toh turant wahan redirect kar do
  if (card.destination_url) {
    let finalUrl = card.destination_url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    redirect(finalUrl);
  }

  // Agar destination URL nahi set kiya hai toh ye dikhega
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '70px', height: '70px', backgroundColor: '#0f172a', borderRadius: '50%', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '28px', fontWeight: 'bold' }}>
          {card.slug.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>TapIxa Card Active</h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px 0' }}>Card Slug: <code>{card.slug}</code></p>
        <div style={{ backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '12px', color: '#475569', fontSize: '13px' }}>
          Is card par abhi koi destination link set nahi hai. Dashboard se URL add karein.
        </div>
      </div>
    </div>
  );
}
