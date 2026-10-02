import { createClient } from '@supabase/supabase-js';

export async function onRequest(context: any) {
  const { params, env } = context;
  const slug = params.slug;

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Supabase environment variables missing in Cloudflare', {
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Database se card read karo
  const { data: card, error } = await supabase
    .from('cards')
    .select('id, destination_url, tap_count')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    return new Response(`Database query error: ${error.message}`, { status: 500 });
  }

  if (!card) {
    return new Response(`Card with slug "${slug}" not found in database.`, {
      status: 404,
    });
  }

  // Tap count increase
  await supabase
    .from('cards')
    .update({ tap_count: (card.tap_count || 0) + 1 })
    .eq('id', card.id);

  // Redirect
  if (card.destination_url) {
    let url = card.destination_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return Response.redirect(url, 307);
  }

  return new Response(`Card "${slug}" is active, but no URL configured.`, {
    status: 200,
  });
}
