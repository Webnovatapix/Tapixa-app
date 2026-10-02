'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CardOverview {
  id: string;
  slug: string;
  user_id: string | null;
  destination_url: string | null;
  tap_count: number;
  created_at: string;
}

export default function AdminPage() {
  const [cards, setCards] = useState<CardOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState('card');
  const [quantity, setQuantity] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeQrSlug, setActiveQrSlug] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchSystemCards();
  }, []);

  async function fetchSystemCards() {
    setLoading(true);
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  }

  function downloadCsv(newCardsList: { slug: string }[]) {
    const origin = window.location.origin;
    const csvRows = [
      ['Slug', 'Activation Link', 'Redirect URL (QR Destination)']
    ];

    newCardsList.forEach(c => {
      csvRows.push([
        c.slug,
        `${origin}/activate?card=${c.slug}`,
        `${origin}/c/${c.slug}`
      ]);
    });

    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tapixa_batch_${prefix}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleBatchGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setStatusMessage('');

    const newCards = [];
    for (let i = 0; i < quantity; i++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const slug = `${prefix}${randomSuffix}`;
      newCards.push({ slug });
    }

    const { data, error } = await supabase
      .from('cards')
      .insert(newCards)
      .select();

    if (error) {
      setStatusMessage(`Error generating cards: ${error.message}`);
    } else {
      setStatusMessage(`Successfully generated ${data.length} new card slug(s) and downloaded manufacturer CSV!`);
      downloadCsv(newCards);
      fetchSystemCards();
    }

    setGenerating(false);
  }

  const unclaimedCount = cards.filter((c) => !c.user_id).length;
  const activeCount = cards.filter((c) => c.user_id).length;
  const totalTaps = cards.reduce((acc, curr) => acc + (curr.tap_count || 0), 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>
              A
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', color: '#0f172a' }}>TapIxa Admin</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Card Provisioning & System Overview</h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginTop: '4px' }}>
            Generate new NFC card slugs in bulk, auto-export manufacturer CSVs, and manage inventory.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Registered Slugs</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '8px 0 0 0' }}>{cards.length}</h2>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Active / Claimed Cards</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#16a34a', margin: '8px 0 0 0' }}>{activeCount}</h2>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Unclaimed Inventory</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#d97706', margin: '8px 0 0 0' }}>{unclaimedCount}</h2>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>System Tap Volume</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb', margin: '8px 0 0 0' }}>{totalTaps}</h2>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0' }}>Batch Pre-Provisioning Generator</h3>
          <form onSubmit={handleBatchGenerate} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Slug Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                required
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '160px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Batch Quantity</label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={generating}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', height: '42px' }}
            >
              {generating ? 'Generating...' : 'Generate & Download CSV'}
            </button>
          </form>

          {statusMessage && (
            <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600', color: statusMessage.includes('Error') ? '#dc2626' : '#16a34a' }}>
              {statusMessage}
            </p>
          )}
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' }}>All System Slugs</h3>
          {loading ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading card inventory...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>Slug</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Destination</th>
                    <th style={{ padding: '12px' }}>Taps</th>
                    <th style={{ padding: '12px' }}>Actions / QR</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr key={card.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>
                        <code>{card.slug}</code>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {card.user_id ? (
                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                            Claimed
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                            Unclaimed
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>
                        {card.destination_url || 'None'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#2563eb' }}>
                        {card.tap_count || 0}
                      </td>
                      <td style={{ padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <a
                          href={`/activate?card=${card.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '13px' }}
                        >
                          Activate
                        </a>
                        <button
                          onClick={() => setActiveQrSlug(card.slug)}
                          style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                        >
                          View QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {activeQrSlug && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', textAlign: 'center', maxWidth: '320px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Card QR Code</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Scan or download QR for slug: <code>{activeQrSlug}</code></p>
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-block', marginBottom: '20px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.origin}/c/${activeQrSlug}`)}`}
                alt={`QR for ${activeQrSlug}`}
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>
            <div>
              <button
                onClick={() => setActiveQrSlug(null)}
                style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
