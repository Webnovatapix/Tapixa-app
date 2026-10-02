export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // URL se seedhe slug nikal lo (e.g. /c/card1234 -> card1234)
    const pathname = request.nextUrl.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new NextResponse(
        'Supabase environment variables missing in Cloudflare.',
        { status: 500 }
      );
    }

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

    // Tap count badhao
    await supabase
      .from('cards')
      .update({ tap_count: (card.tap_count || 0) + 1 })
      .eq('id', card.id);

    // Agar destination URL hai toh redirect karo
    if (card.destination_url) {
      let finalUrl = card.destination_url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return NextResponse.redirect(new URL(finalUrl));
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
