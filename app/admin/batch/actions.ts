'use server';

import { randomBytes, randomUUID } from 'node:crypto';

import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import type { BatchRow, GenerateBatchResult } from '@/lib/types';
import { getCardBaseUrl } from '@/lib/url';

/**
 * Bulk card generator (server only).
 *
 * Runs with the service-role key so it can insert rows that browser roles
 * cannot. The caller is verified as an admin first (app_metadata.role).
 *
 * Slugs: 8 chars from a 31-char alphabet (lowercase + digits, minus the
 * look-alikes i, l, o, 0, 1) so a code printed on a card is easy to read
 * aloud or type. ~8.5e11 combinations; collisions are retried.
 */

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SLUG_LENGTH = 8;
const MAX_BATCH = 1000;
const MAX_ATTEMPTS = 3;
const PREVIEW_ROWS = 5;

// Largest multiple of the alphabet size that fits in a byte. Bytes at or
// above it are discarded so every character is equally likely (no modulo bias).
const BYTE_LIMIT = 256 - (256 % ALPHABET.length);

function generateSlug(): string {
  let slug = '';
  while (slug.length < SLUG_LENGTH) {
    for (const byte of randomBytes(SLUG_LENGTH * 2)) {
      if (byte >= BYTE_LIMIT) continue;
      slug += ALPHABET[byte % ALPHABET.length];
      if (slug.length === SLUG_LENGTH) break;
    }
  }
  return slug;
}

function generateUniqueSlugs(count: number): string[] {
  const slugs = new Set<string>();
  while (slugs.size < count) slugs.add(generateSlug());
  return [...slugs];
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV for NFC encoders and variable-data QR printing: card_id,slug,redirect_url */
function toCsv(rows: BatchRow[]): string {
  const lines = rows.map((r) => [r.card_id, r.slug, r.redirect_url].map(csvCell).join(','));
  return ['card_id,slug,redirect_url', ...lines].join('\r\n') + '\r\n';
}

function batchFilename(count: number): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `tapflow-batch-${stamp}-${count}.csv`;
}

export async function generateBatch(count: number): Promise<GenerateBatchResult> {
  // 1. Authorize. Never trust that middleware alone protected this call.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'admin') {
    return { ok: false, error: 'You do not have permission to generate batches.' };
  }

  // 2. Validate input.
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    return { ok: false, error: `Enter a whole number from 1 to ${MAX_BATCH.toLocaleString()}.` };
  }

  const baseUrl = getCardBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: 'NEXT_PUBLIC_CARD_BASE_URL is not set on the server.' };
  }

  // 3. Insert in ONE statement so the batch is all-or-nothing.
  //    Ids are generated here so the CSV never depends on what the
  //    database returns.
  const admin = createAdminSupabase();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const rows: BatchRow[] = generateUniqueSlugs(count).map((slug) => ({
      card_id: randomUUID(),
      slug,
      redirect_url: `${baseUrl}/c/${slug}`,
    }));

    const { error } = await admin
      .from('cards')
      .insert(rows.map((r) => ({ id: r.card_id, slug: r.slug, status: 'unclaimed' })));

    if (!error) {
      console.info(JSON.stringify({ event: 'batch_generated', admin: user.id, count }));
      return {
        ok: true,
        count,
        preview: rows.slice(0, PREVIEW_ROWS),
        csv: toCsv(rows),
        filename: batchFilename(count),
      };
    }

    // 23505 = unique_violation: a slug already exists. Nothing was inserted; regenerate.
    if (error.code === '23505') continue;

    console.error(JSON.stringify({ event: 'batch_insert_failed', code: error.code, message: error.message }));
    return { ok: false, error: 'The database rejected the batch. No cards were created.' };
  }

  return { ok: false, error: 'Could not find enough unused slugs. No cards were created. Try again.' };
}
