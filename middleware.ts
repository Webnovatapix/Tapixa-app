import { NextResponse } from 'next/server'; 
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Agar request /c/ se start hoti hai
  if (pathname.startsWith('/c/')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[1]; // card1234 nikalega

    if (!slug) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new NextResponse('Supabase keys missing in environment variables', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Database se card read karo
    const { data: card, error } = await supabase
      .from('cards')
      .select('id, destination_url, tap_count')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !card) {
      return new NextResponse(`Card with slug "${slug}" not found in database.`, { status: 404 });
    }

    // Tap count update
    await supabase
      .from('cards')
      .update({ tap_count: (card.tap_count || 0) + 1 })
      .eq('id', card.id);

    // Seedhe Redirect
    if (card.destination_url) {
      let finalUrl = card.destination_url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return NextResponse.redirect(finalUrl);
    }

    return new NextResponse(`Card "${slug}" is active, but no URL configured.`, { status: 200 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/c/:path*'],
};
