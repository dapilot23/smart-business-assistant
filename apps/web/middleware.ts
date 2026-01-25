import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/api/webhooks(.*)',
  '/book(.*)',
  '/booking(.*)',
  '/onboarding(.*)',
  '/invite(.*)',
]);

// Demo mode - bypass all auth
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default clerkMiddleware(async (auth, request) => {
  // In demo mode, allow all routes
  if (isDemoMode) {
    return NextResponse.next();
  }

  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect_url', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
