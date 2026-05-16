import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';


// Only these routes are PUBLIC (no login needed)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',
  // '/forgot-password(.*)',
  // 'reset-password(.*)',
])

export default clerkMiddleware(async(auth, req)=>{

  const {userId} = await auth();
  const url = req.nextUrl;


  // If NOT logged in and trying to access protected route
  // → redirect to sign-in
  if(!userId && !isPublicRoute(req)){
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // If ALREADY logged in and visiting /sign-in or /
  // → redirect to dashboard
  if(userId && (url.pathname === '/' || url.pathname === '/sign-in')){
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};