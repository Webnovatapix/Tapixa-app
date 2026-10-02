export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // Next.js 15/16 me params promise ko await karna zaroori hai
    const { slug } = await context.params;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://lygyoqdygyardxvuhifu.supabase.co';
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_F9hdKS-Q5f-D0bkUpC7w2g_E00xhiQp';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Database se card dhundo
    const { data: card, error } = await supabase
      .from('cards')
      .select('id, destination_url, tap_count')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return new NextResponse(`Database Query Error: ${error.message}`, {
        status: 500,
      });
    }

    if (!card) {
      return new NextResponse(
        `Card not found: Slug "${slug}" database me nahi mila.`,
        { status: 404 }
      );
    }

    // Tap count background me badhao (fail hone par redirect mat roko)
    try {
      await supabase
        .from('cards')
        .update({ tap_count: (card.tap_count || 0) + 1 })
        .eq('id', card.id);
    } catch (e) {
      console.error('Failed to update tap count:', e);
    }

    // Agar destination URL hai toh redirect karo
    if (card.destination_url) {
      let finalUrl = card.destination_url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return NextResponse.redirect(finalUrl, { status: 307 });
    }

    return new NextResponse(
      `Card "${slug}" active hai, lekin iska destination URL blank hai.`,
      { status: 200 }
    );
  } catch (err: any) {
    return new NextResponse(`Internal Error: ${err?.message || err}`, {
      status: 500,
    });
  }
}
