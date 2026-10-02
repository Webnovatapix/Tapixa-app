export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://lygyoqdygyardxvuhifu.supabase.co';
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_F9hdKS-Q5f-D0bkUpC7w2g_E00xhiQp';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch card details
    const { data: card, error } = await supabase
      .from('cards')
      .select('id, destination_url, tap_count')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !card) {
      return new NextResponse(
        `Card with slug "${slug}" not found in database.`,
        { status: 404, headers: { 'content-type': 'text/plain;charset=UTF-8' } }
      );
    }

    // 2. Increment tap count in background
    supabase
      .from('cards')
      .update({ tap_count: (card.tap_count || 0) + 1 })
      .eq('id', card.id)
      .then();

    // 3. Direct Redirect
    if (card.destination_url) {
      let finalUrl = card.destination_url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return NextResponse.redirect(finalUrl, 307);
    }

    return new NextResponse(
      `Card "${slug}" is active, but no destination URL set.`,
      { status: 200, headers: { 'content-type': 'text/plain;charset=UTF-8' } }
    );
  } catch (err: any) {
    return new NextResponse(`Server Error: ${err?.message || err}`, {
      status: 500,
    });
  }
}
