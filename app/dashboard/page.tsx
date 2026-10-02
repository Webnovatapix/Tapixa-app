'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface CardItem {
  id: string;
  slug: string;
  title: string | null;
  destination_url: string | null;
  tap_count?: number;
  created_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }
      setUser(user);

      // Fetch user's claimed cards
      const { data: userCards } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id);

      if (userCards) {
        setCards(userCards);
      }
      setLoading(false);
    }

    loadDashboardData();
  }, [router, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  function handleActivateCard() {
    const code = prompt('Enter the 8-character card code (e.g., card1234):');
    if (code && code.trim()) {
      router.push(`/activate?card=${encodeURIComponent(code.trim())}`);
    }
  }

  function startEditing(card: CardItem) {
    setEditingCardId(card.id);
    setEditUrl(card.destination_url || '');
  }

  async function handleSaveUrl(cardId: string) {
    setSaving(true);
    const { error } = await supabase
      .from('cards')
      .update({ destination_url: editUrl })
      .eq('id', cardId);

    if (!error) {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, destination_url: editUrl } : c))
      );
      setEditingCardId(null);
    } else {
      alert('Failed to update URL: ' + error.message);
    }
    setSaving(false);
  }

  const totalTaps = cards.reduce((acc, curr) => acc + (curr.tap_count || 0), 0);

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '500' }}>Loading TapIxa Dashboard...</p>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '18px' }}>
              T
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', color: '#0f172a' }}>TapIxa</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>{user?.email}</span>
            <button
              onClick={handleSignOut}
              style={{
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#dc2626',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Welcome back!</h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginTop: '4px' }}>
            Manage your physical NFC cards, destinations, and track analytics.
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Active Cards</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#2563eb', margin: '8px 0 0 0' }}>{cards.length}</h2>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Card Taps</p>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '8px 0 0 0' }}>{totalTaps}</h2>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', margin: 0 }}>System Status</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', marginTop: '12px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
              Connected
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Your NFC Cards</h3>
            <button
              onClick={handleActivateCard}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
            >
              + Activate New Card
            </button>
          </div>

          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <p style={{ fontSize: '15px', margin: 0 }}>You have not activated any NFC cards yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cards.map((card) => (
                <div key={card.id} style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold' }}>
                        NFC
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                          Card Slug: <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{card.slug}</code>
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                          Taps: <strong style={{ color: '#2563eb' }}>{card.tap_count || 0}</strong>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {editingCardId !== card.id && (
                        <button
                          onClick={() => startEditing(card)}
                          style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                        >
                          Edit Link
                        </button>
                      )}
                      <a
                        href={`/c/${card.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}
                      >
                        Test Link (/c/{card.slug})
                      </a>
                    </div>
                  </div>

                  {/* Inline Destination Editor */}
                  {editingCardId === card.id ? (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                      />
                      <button
                        onClick={() => handleSaveUrl(card.id)}
                        disabled={saving}
                        style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingCardId(null)}
                        style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>
                      Destination URL: <a href={card.destination_url || '#'} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{card.destination_url || 'Not set'}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}