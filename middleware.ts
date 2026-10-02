import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Let the dynamic route handlers handle the requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - c (NFC card redirect routes handled by app/c/[slug]/route.ts)
     */
    '/((?!_next/static|_next/image|favicon.ico|c/.*).*)',
  ],
};
