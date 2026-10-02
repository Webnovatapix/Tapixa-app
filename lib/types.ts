/**
 * Shared types for the TapFlow web app.
 * Mirrors the Postgres schema (001 + 002 migrations).
 */

/**
 * 'paused'    -> owner switched the card off (owner can switch back on)
 * 'suspended' -> issuer/admin locked the card (owner cannot change it)
 */
export type CardStatus = 'unclaimed' | 'active' | 'paused' | 'suspended';

export interface Card {
  id: string;
  slug: string;
  user_id: string | null;
  status: CardStatus;
  destination_url: string | null;
  title: string | null;
  created_at: string;
}

/** Row shape of the `card_tap_counts` view. */
export interface CardTapStats {
  card_id: string;
  total_taps: number;
  taps_7d: number;
  last_scanned_at: string | null;
}

/** Return value of the `get_card_claim_state` RPC. */
export type ClaimState = CardStatus | 'not_found';

/** One line of the CSV handed to the NFC / QR printer. */
export interface BatchRow {
  card_id: string;
  slug: string;
  redirect_url: string;
}

/** Result returned by the `generateBatch` server action. */
export type GenerateBatchResult =
  | {
      ok: true;
      count: number;
      preview: BatchRow[];
      csv: string;
      filename: string;
    }
  | { ok: false; error: string };
