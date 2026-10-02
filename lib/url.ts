/**
 * URL helpers shared by client components, server actions and route handlers.
 * Keep this file free of server-only imports.
 */

/** Slugs are 8 alphanumeric characters (matches the DB check + Worker route). */
export const SLUG_PATTERN = /^[A-Za-z0-9]{8}$/;

const MAX_URL_LENGTH = 2048;

export type UrlResult = { ok: true; url: string } | { ok: false; error: string };

interface NormalizeOptions {
  /** Hostnames that must not be used as a destination (prevents redirect loops). */
  blockedHosts?: string[];
}

/**
 * Validates a user-supplied destination and returns a clean https:// URL.
 * - Adds https:// when no scheme is typed ("linkedin.com/in/me" works).
 * - Rejects http://, mailto:, javascript: and any other scheme.
 * - Rejects the card domain itself so a card cannot redirect to itself.
 */
export function normalizeHttpsUrl(raw: string, options: NormalizeOptions = {}): UrlResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, error: 'Enter the link this card should open.' };
  }
  if (/^http:\/\//i.test(trimmed)) {
    return { ok: false, error: 'Links must start with https://. Plain http:// links are not supported.' };
  }

  // A typed scheme looks like "abc:"; anything else gets https:// prepended.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  if (candidate.length > MAX_URL_LENGTH) {
    return { ok: false, error: 'This link is too long. Use a shorter link.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: 'This does not look like a valid link. Check it and try again.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only https:// links are supported.' };
  }
  if (!parsed.hostname.includes('.')) {
    return { ok: false, error: 'Enter a full web address, like example.com/page.' };
  }
  if (options.blockedHosts?.some((h) => h.toLowerCase() === parsed.hostname.toLowerCase())) {
    return { ok: false, error: 'A card cannot link to its own card address. Choose a different link.' };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Base URL of the redirect domain, without a trailing slash.
 * NEXT_PUBLIC_ so the dashboard can show and copy card links.
 * Must be referenced literally so Next.js inlines it at build time.
 */
export function getCardBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_CARD_BASE_URL;
  return raw ? raw.replace(/\/+$/, '') : null;
}

/** Full redirect URL printed on a physical card. */
export function cardRedirectUrl(slug: string): string {
  return `${getCardBaseUrl() ?? ''}/c/${slug}`;
}

export function getCardHost(): string | null {
  const base = getCardBaseUrl();
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

/**
 * Only allow same-site relative paths after login (blocks open redirects
 * such as "//evil.com" or "https://evil.com").
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}
