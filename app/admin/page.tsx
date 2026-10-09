'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// -------------------------------------------------------------
// Authorized Admin Whitelist
// -------------------------------------------------------------
const ALLOWED_ADMIN_EMAILS = [
  'chaitanyakolambe8@gmail.com',
  'rudragupta607@gmail.com',
  'webnovatechs@gmail.com',
];

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
  const [authChecking, setAuthChecking] = useState(true);
  const [authorizedEmail, setAuthorizedEmail] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-provisioning states
  const [prefix, setPrefix] = useState('card');
  const [quantity, setQuantity] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Modals state
  const [activeQrSlug, setActiveQrSlug] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CardOverview | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    setAuthChecking(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user || !session.user.email) {
      router.push('/dashboard');
      return;
    }

    const email = session.user.email.toLowerCase().trim();
    const isWhitelisted = ALLOWED_ADMIN_EMAILS.some(
      (allowed) => allowed.toLowerCase().trim() === email
    );

    if (!isWhitelisted) {
      setAuthorizedEmail(email);
      setAuthChecking(false);
      return;
    }

    setAuthorizedEmail(email);
    setAuthChecking(false);
    fetchSystemCards();
  }

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
      ['Slug', 'Activation Link', 'Redirect URL (QR Destination)'],
    ];

    newCardsList.forEach((c) => {
      csvRows.push([
        c.slug,
        `${origin}/activate?card=${c.slug}`,
        `${origin}/c/${c.slug}`,
      ]);
    });

    const csvContent = csvRows.map((e) => e.join(',')).join('\n');
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
      setStatusMessage(
        `Successfully generated ${data.length} new card slug(s) and downloaded manufacturer CSV!`
      );
      downloadCsv(newCards);
      fetchSystemCards();
    }

    setGenerating(false);
  }

  // Handle Edit Destination URL
  function openEditModal(card: CardOverview) {
    setEditingCard(card);
    setEditUrlInput(card.destination_url || '');
  }

  async function handleSaveDestinationUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    setSavingEdit(true);
    let finalUrl = editUrlInput.trim();
    if (
      finalUrl &&
      !finalUrl.startsWith('http://') &&
      !finalUrl.startsWith('https://')
    ) {
      finalUrl = `https://${finalUrl}`;
    }

    const { error } = await supabase
      .from('cards')
      .update({ destination_url: finalUrl || null })
      .eq('id', editingCard.id);

    if (!error) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCard.id
            ? { ...c, destination_url: finalUrl || null }
            : c
        )
      );
      setEditingCard(null);
    } else {
      alert(`Update failed: ${error.message}`);
    }
    setSavingEdit(false);
  }

  // Filter cards by search query
  const filteredCards = cards.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.slug.toLowerCase().includes(q) ||
      (c.destination_url && c.destination_url.toLowerCase().includes(q))
    );
  });

  const unclaimedCount = cards.filter((c) => !c.user_id).length;
  const activeCount = cards.filter((c) => c.user_id).length;
  const totalTaps = cards.reduce((acc, curr) => acc + (curr.tap_count || 0), 0);

  // Authorization Loading Screen
  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>
          Verifying admin authorization...
        </p>
      </div>
    );
  }

  // Access Denied Screen (Logged-in user is not in the whitelist)
  const isWhitelisted =
    authorizedEmail &&
    ALLOWED_ADMIN_EMAILS.some(
      (allowed) =>
        allowed.toLowerCase().trim() === authorizedEmail.toLowerCase().trim()
    );

  if (!isWhitelisted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            backgroundColor: '#ffffff',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid #fee2e2',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
            }}
          >
            ✕
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 8px',
            }}
          >
            Access Denied
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0 0 20px',
              lineHeight: '1.5',
            }}
          >
            Account <b>{authorizedEmail}</b> ke paas TapIxa Admin panel ka access nahi hai.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 32px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '18px',
              }}
            >
              A
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: '700',
                letterSpacing: '-0.5px',
                color: '#0f172a',
              }}
            >
              TapIxa Admin
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </header>

      <main
        style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 32px' }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '800',
              color: '#0f172a',
              margin: 0,
            }}
          >
            Card Provisioning & System Overview
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b', marginTop: '4px' }}>
            Generate new NFC card slugs in bulk, auto-export manufacturer CSVs,
            search inventory, and manage links.
          </p>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Total Registered Slugs
            </p>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#0f172a',
                margin: '8px 0 0 0',
              }}
            >
              {cards.length}
            </h2>
          </div>
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Active / Claimed Cards
            </p>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#16a34a',
                margin: '8px 0 0 0',
              }}
            >
              {activeCount}
            </h2>
          </div>
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              Unclaimed Inventory
            </p>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#d97706',
                margin: '8px 0 0 0',
              }}
            >
              {unclaimedCount}
            </h2>
          </div>
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              System Tap Volume
            </p>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#2563eb',
                margin: '8px 0 0 0',
              }}
            >
              {totalTaps}
            </h2>
          </div>
        </div>

        {/* Batch Generator */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 16px 0',
            }}
          >
            Batch Pre-Provisioning Generator
          </h3>
          <form
            onSubmit={handleBatchGenerate}
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Slug Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                required
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  width: '160px',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Batch Quantity
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  width: '120px',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={generating}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                height: '42px',
              }}
            >
              {generating ? 'Generating...' : 'Generate & Download CSV'}
            </button>
          </form>

          {statusMessage && (
            <p
              style={{
                marginTop: '16px',
                fontSize: '14px',
                fontWeight: '600',
                color: statusMessage.includes('Error') ? '#dc2626' : '#16a34a',
              }}
            >
              {statusMessage}
            </p>
          )}
        </div>

        {/* Slugs Table with Search Filter */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: 0,
                }}
              >
                All System Slugs
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Showing {filteredCards.length} of {cards.length} cards
              </p>
            </div>
            {/* Real-time Search Box */}
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Search slug or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Loading card inventory...
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '14px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid #f1f5f9',
                      color: '#64748b',
                    }}
                  >
                    <th style={{ padding: '12px' }}>Slug</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Destination</th>
                    <th style={{ padding: '12px' }}>Taps</th>
                    <th style={{ padding: '12px' }}>Actions / QR</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.map((card) => (
                    <tr
                      key={card.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td
                        style={{
                          padding: '12px',
                          fontWeight: '700',
                          color: '#0f172a',
                        }}
                      >
                        <code>{card.slug}</code>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {card.user_id ? (
                          <span
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '700',
                            }}
                          >
                            Claimed
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '700',
                            }}
                          >
                            Unclaimed
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          color: '#475569',
                          maxWidth: '280px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {card.destination_url ? (
                          <a
                            href={card.destination_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: '#2563eb',
                              textDecoration: 'none',
                            }}
                          >
                            {card.destination_url}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontWeight: '600',
                          color: '#2563eb',
                        }}
                      >
                        {card.tap_count || 0}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          onClick={() => openEditModal(card)}
                          style={{
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Edit Link
                        </button>
                        <a
                          href={`/activate?card=${card.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#2563eb',
                            textDecoration: 'underline',
                            fontSize: '12px',
                            padding: '0 4px',
                          }}
                        >
                          Activate
                        </a>
                        <button
                          onClick={() => setActiveQrSlug(card.slug)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
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

      {/* Edit Destination URL Modal */}
      {editingCard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '28px',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3
              style={{
                margin: '0 0 6px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              Edit Destination Link
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              Updating card: <b><code>{editingCard.slug}</code></b>
            </p>
            <form onSubmit={handleSaveDestinationUrl}>
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  Destination URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/portfolio"
                  value={editUrlInput}
                  onChange={(e) => setEditUrlInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {savingEdit ? 'Saving...' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrSlug && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              maxWidth: '320px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#0f172a',
              }}
            >
              Card QR Code
            </h3>
            <p
              style={{
                margin: '0 0 20px 0',
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              Scan or download QR for slug: <code>{activeQrSlug}</code>
            </p>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'inline-block',
                marginBottom: '20px',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${activeQrSlug}`
                )}`}
                alt={`QR for ${activeQrSlug}`}
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>
            <div>
              <button
                onClick={() => setActiveQrSlug(null)}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%',
                }}
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
