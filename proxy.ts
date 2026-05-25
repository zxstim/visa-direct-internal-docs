import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/sign-in') ||
    request.nextUrl.pathname.startsWith('/sign-up');
  const isNotVerifiedRoute = request.nextUrl.pathname === '/not-verified';

  // Redirect authenticated users away from auth pages
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/docs', request.url));
  }

  // Redirect unauthenticated users to sign-in
  if (!session && !isAuthRoute && !isNotVerifiedRoute) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check email verification for authenticated users accessing protected routes
  if (session && !session.user.emailVerified && !isAuthRoute && !isNotVerifiedRoute) {
    return NextResponse.redirect(new URL('/not-verified', request.url));
  }

  // Redirect verified users away from not-verified page
  if (session?.user.emailVerified && isNotVerifiedRoute) {
    return NextResponse.redirect(new URL('/docs', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/docs/:path*', '/sign-in', '/sign-up', '/llms.txt', '/llms-full.txt', '/not-verified'],
};
