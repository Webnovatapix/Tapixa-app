export const runtime = 'edge'; 

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new NextResponse(
        'Supabase environment variables missing in Cloudflare settings.',
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Slug se card dhoondo
    const { data: card, error } = await supabase
      .from('cards')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return new NextResponse(`Database Query Error: ${error.message}`, {
        status: 500,
      });
    }

    if (!card) {
      return new NextResponse(
        `Card not found: Slug "${slug}" database me maujood nahi hai.`,
        { status: 404 }
      );
    }

    // Tap count update karo background me
    await supabase
      .from('cards')
      .update({ tap_count: (card.tap_count || 0) + 1 })
      .eq('id', card.id);

    // Destination URL check & redirect
    if (card.destination_url) {
      let finalUrl = card.destination_url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return NextResponse.redirect(finalUrl, 307);
    }

    return new NextResponse(
      `Card "${slug}" active hai, lekin iska destination URL dashboard me blank hai.`,
      { status: 200 }
    );
  } catch (err: any) {
    return new NextResponse(`Internal Error: ${err?.message || err}`, {
      status: 500,
    });
  }
}
