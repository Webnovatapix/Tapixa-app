'use client';

import { FormEvent, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { Briefcase, Contact, Eye, EyeOff, Globe, Link2, Loader2, Nfc } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import type { ClaimState } from '@/lib/types';
import { SLUG_PATTERN, getCardHost, normalizeHttpsUrl, safeNextPath } from '@/lib/url';

type AuthMode = 'signup' | 'signin';
type ClaimUiState = ClaimState | 'checking' | 'lookup_failed';

interface Preset {
  id: string;
  label: string;
  icon: LucideIcon;
  prefix: string;
  hint: string;
}

const PRESETS: Preset[] = [
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase, prefix: 'https://www.linkedin.com/in/', hint: 'Add your profile name after /in/.' },
  { id: 'portfolio', label: 'Portfolio', icon: Globe, prefix: 'https://', hint: 'Paste the address of your site.' },
  { id: 'vcard', label: 'Contact card', icon: Contact, prefix: 'https://', hint: 'Link to a hosted .vcf file so phones offer to save your contact.' },
  { id: 'other', label: 'Other link', icon: Link2, prefix: 'https://', hint: 'Any https:// page works.' },
];

const INPUT_CLASS =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900';

// High-contrast solid dark button for crystal clear visibility
const BUTTON_CLASS =
  'inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50';

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <Frame>
          <Spinner label="Loading" />
        </Frame>
      }
    >
      <ActivateFlow />
    </Suspense>
  );
}

function ActivateFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const rawSlug = params.get('card');
  const slug = rawSlug && SLUG_PATTERN.test(rawSlug) ? rawSlug : null;
  const slugInvalid = rawSlug !== null && slug === null;
  const nextPath = safeNextPath(params.get('next'));
  const returnPath = slug ? `/activate?card=${slug}` : nextPath;
  const confirmationFailed = params.get('error') === 'confirmation_failed';

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const [claimState, setClaimState] = useState<ClaimUiState>('checking');

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setClaimState('checking');

    supabase.rpc('get_card_claim_state', { p_slug: slug }).then(({ data, error }) => {
      if (!active) return;
      if (error || typeof data !== 'string') {
        setClaimState('lookup_failed');
        return;
      }
      setClaimState(data as ClaimState);
    });

    return () => {
      active = false;
    };
  }, [slug, supabase]);

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnPath)}`,
        },
      });

      if (error) {
        setAuthError(error.message);
      } else if (data.user && data.user.identities?.length === 0) {
        setAuthError('An account with this email already exists. Sign in instead.');
        setMode('signin');
      } else if (!data.session) {
        setAuthNotice(`We sent a confirmation link to ${email.trim()}. Open it on this device to continue.`);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthError('Email or password is incorrect.');
      }
    }

    setAuthBusy(false);
  }

  useEffect(() => {
    if (authReady && user && !rawSlug) {
      router.replace(nextPath);
      router.refresh();
    }
  }, [authReady, user, rawSlug, nextPath, router]);

  const [dest, setDest] = useState('');
  const [title, setTitle] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const destRef = useRef<HTMLInputElement>(null);

  function applyPreset(preset: Preset) {
    const isPrefixOnly = dest === '' || PRESETS.some((p) => p.prefix === dest);
    if (isPrefixOnly) setDest(preset.prefix);
    setHint(preset.hint);
    destRef.current?.focus();
  }

  async function handleClaim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (claimBusy || !slug) return;

    const cardHost = getCardHost();
    const parsed = normalizeHttpsUrl(dest, { blockedHosts: cardHost ? [cardHost] : [] });
    if (!parsed.ok) {
      setClaimError(parsed.error);
      return;
    }

    setClaimBusy(true);
    setClaimError(null);

    const { error } = await supabase.rpc('claim_card', {
      p_slug: slug,
      p_destination_url: parsed.url,
      p_title: title.trim() || null,
    });

    if (error) {
      setClaimBusy(false);
      if (error.message.includes('card_unavailable')) {
        setClaimState('active');
      } else if (error.message.includes('not_authenticated')) {
        setClaimError('Your session expired. Sign in again to claim this card.');
        setUser(null);
      } else {
        setClaimError('We could not claim this card. Check your link and try again.');
      }
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  if (!authReady) {
    return (
      <Frame>
        <Spinner label="Loading" />
      </Frame>
    );
  }

  if (slugInvalid) {
    return (
      <Frame>
        <Heading title="This card link is not valid" />
        <p className="mt-2 text-sm text-zinc-600">
          The card code in this link is malformed. Scan the card again, or type the 8-character code printed on it.
        </p>
      </Frame>
    );
  }

  if (!slug) {
    if (user) {
      return (
        <Frame>
          <Heading title="Already signed in" subtitle={`Signed in as ${user.email}`} />
          <Link
            href="/dashboard"
            className="mt-4 inline-block w-full rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Go to Dashboard
          </Link>
        </Frame>
      );
    }
    return (
      <Frame>
        <Heading
          title={mode === 'signup' ? 'Create your account' : 'Sign in'}
          subtitle={mode === 'signup' ? 'Manage your cards in one place.' : 'Welcome back.'}
        />
        {confirmationFailed && (
          <Alert tone="error">
            That confirmation link expired or was already used. Sign in, or create the account again to get a new link.
          </Alert>
        )}
        <AuthForm
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          busy={authBusy}
          error={authError}
          notice={authNotice}
          onSubmit={handleAuth}
        />
      </Frame>
    );
  }

  if (claimState === 'checking') {
    return (
      <Frame slug={slug}>
        <Spinner label="Checking your card" />
      </Frame>
    );
  }

  if (claimState === 'lookup_failed') {
    return (
      <Frame slug={slug}>
        <Heading title="We could not check this card" />
        <p className="mt-2 text-sm text-zinc-600">Check your connection and reload the page.</p>
      </Frame>
    );
  }

  if (claimState === 'not_found') {
    return (
      <Frame slug={slug}>
        <Heading title="We could not find this card" />
        <p className="mt-2 text-sm text-zinc-600">
          Check the code printed on the card, or contact the company that gave it to you.
        </p>
      </Frame>
    );
  }

  if (claimState !== 'unclaimed') {
    return (
      <Frame slug={slug}>
        <Heading title="This card is already claimed" />
        <p className="mt-2 text-sm text-zinc-600">
          If it belongs to you, manage it from your dashboard. Otherwise, contact the company that gave it to you.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block text-sm font-semibold text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
        >
          Open dashboard
        </Link>
      </Frame>
    );
  }

  if (!user) {
    return (
      <Frame slug={slug}>
        <Heading
          title={mode === 'signup' ? 'Activate your card' : 'Sign in to claim this card'}
          subtitle={
            mode === 'signup'
              ? 'Create an account to claim it. You choose where it links next.'
              : 'Use the account you want this card to belong to.'
          }
        />
        <AuthForm
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          busy={authBusy}
          error={authError}
          notice={authNotice}
          onSubmit={handleAuth}
        />
      </Frame>
    );
  }

  return (
    <Frame slug={slug}>
      <Heading title="Where should this card link?" subtitle="You can change this any time from your dashboard." />

      <form onSubmit={handleClaim} className="mt-6 space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-900">Link type</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:border-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="dest" className="mb-1.5 block text-sm font-medium text-zinc-900">
            Destination link
          </label>
          <input
            id="dest"
            ref={destRef}
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="https://"
            className={INPUT_CLASS}
          />
          {hint && <p className="mt-1.5 text-sm text-zinc-500">{hint}</p>}
        </div>

        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-zinc-900">
            Card name <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My business card"
            className={INPUT_CLASS}
          />
        </div>

        {claimError && <Alert tone="error">{claimError}</Alert>}

        <button type="submit" disabled={claimBusy} className={BUTTON_CLASS}>
          {claimBusy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Claim card
        </button>

        <p className="text-sm text-zinc-500">Signed in as {user.email}.</p>
      </form>
    </Frame>
  );
}

function Frame({ slug, children }: { slug?: string | null; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-12 sm:items-center">
      <div className="w-full max-w-md">
        {slug && (
          <div className="mb-6 inline-flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3">
            <Nfc className="h-5 w-5 text-zinc-900" aria-hidden />
            <span className="font-mono text-lg tracking-widest text-zinc-900">{slug}</span>
          </div>
        )}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">{children}</div>
      </div>
    </main>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-zinc-600">{subtitle}</p>}
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-600" role="status">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {label}
    </div>
  );
}

function Alert({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-zinc-200 bg-zinc-50 text-zinc-800';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-md border px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}

interface AuthFormProps {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

function AuthForm({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  busy,
  error,
  notice,
  onSubmit,
}: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${INPUT_CLASS} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        {mode === 'signup' && <p className="mt-1.5 text-sm text-zinc-500">At least 8 characters.</p>}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}

      {/* Solid Black Button */}
      <button type="submit" disabled={busy} className={BUTTON_CLASS}>
        {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>

      <p className="text-sm text-zinc-600">
        {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          className="font-semibold text-zinc-900 underline underline-offset-4 hover:text-zinc-700"
        >
          {mode === 'signup' ? 'Sign in' : 'Create account'}
        </button>
      </p>
    </form>
  );
}
