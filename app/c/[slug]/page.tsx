export const runtime = 'edge'; 
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
  // Next.js 15/16 mein params ek Promise hai, isliye await lagana zaroori hai
  const { slug } = await params;

  // Initialize server Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch card details by slug
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !card) {
    notFound();
  }

  // Increment tap count asynchronously
  await supabase
    .from('cards')
    .update({ tap_count: (card.tap_count || 0) + 1 })
    .eq('id', card.id);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#0f172a', borderRadius: '50%', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '32px', fontWeight: 'bold' }}>
          {card.slug.charAt(0).toUpperCase()}
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
          TapIxa Card
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' }}>
          Slug: <code>{card.slug}</code>
        </p>

        {card.destination_url ? (
          <a
            href={card.destination_url}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', backgroundColor: '#2563eb', color: '#ffffff', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', textDecoration: 'none', fontSize: '15px', marginBottom: '12px' }}
          >
            Visit Website / Link
          </a>
        ) : (
          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '12px', color: '#475569', fontSize: '14px', marginBottom: '16px' }}>
            This card is active, but no destination link has been set yet.
          </div>
        )}

        <div style={{ marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
          Powered by <strong>TapIxa</strong>
        </div>
      </div>
    </div>
  );
}
