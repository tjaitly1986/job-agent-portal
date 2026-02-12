import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Use Node.js runtime for middleware (not Edge)
export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const session = await auth()
  const isAuthenticated = !!session?.user
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Auth routes that authenticated users shouldn't access
  const authRoutes = ['/login', '/register']
  const isAuthRoute = authRoutes.includes(pathname)

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard/jobs', request.url))
  }

  // If user is not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
