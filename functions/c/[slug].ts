import { createClient } from '@supabase/supabase-js';

export async function onRequestGet(context: {
  params: { slug?: string };
  env: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
  waitUntil: (promise: Promise<unknown>) => void;
}) {
  const slug = context.params.slug as string;

  const supabaseUrl =
    context.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://lygyoqdygyardxvuhifu.supabase.co';
  const supabaseKey =
    context.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_F9hdKS-Q5f-D0bkUpC7w2g_E00xhiQp';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch card details
    const { data: card, error } = await supabase
      .from('cards')
      .select('id, destination_url, tap_count')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !card) {
      return new Response(
        `Card with slug "${slug}" not found in database.`,
        { status: 404, headers: { 'content-type': 'text/plain;charset=UTF-8' } }
      );
    }

    // 2. Increment tap count in background via a true Promise
    context.waitUntil(
      (async () => {
        try {
          await supabase
            .from('cards')
            .update({ tap_count: (card.tap_count || 0) + 1 })
            .eq('id', card.id);
        } catch (e) {
          console.error('Failed to increment tap count:', e);
        }
      })()
    );

    // 3. Redirect to destination URL
    if (card.destination_url) {
      let finalUrl = card.destination_url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return Response.redirect(finalUrl, 307);
    }

    return new Response(
      `Card "${slug}" is active, but no destination URL set.`,
      { status: 200, headers: { 'content-type': 'text/plain;charset=UTF-8' } }
    );
  } catch (err: any) {
    return new Response(`Worker Error: ${err?.message || err}`, {
      status: 500,
    });
  }
}
