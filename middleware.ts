// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (url.pathname.endsWith('.html')) {
    url.pathname = url.pathname.replace(/\.html$/, '');
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

// Indica a qué rutas aplica
export const config = {
  matcher: '/:path*', // todas las rutas
};
