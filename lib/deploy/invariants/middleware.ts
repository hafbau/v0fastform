/**
 * Next.js Middleware for Route Protection
 *
 * Protects routes based on authentication requirements and user roles.
 * This file is automatically injected into all generated apps.
 *
 * Generated apps should place this at the root level as `middleware.ts`.
 *
 * @module middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateSession, getSessionFromRequest, hasRole } from './lib/auth-middleware'

/**
 * Route configuration mapping paths to required roles
 * Generated from AppSpec during injection
 */
const ROUTE_CONFIG: Record<string, { requiredRole?: string; authRequired: boolean }> = {
  // Will be populated with routes from AppSpec
  // Example:
  // '/staff': { requiredRole: 'STAFF', authRequired: true },
  // '/staff/inbox': { requiredRole: 'STAFF', authRequired: true },
  // '/welcome': { authRequired: false },
}

/**
 * Check if a path matches a route pattern
 *
 * @param pathname - The request pathname
 * @param pattern - The route pattern (supports [id] style params)
 * @returns True if pathname matches pattern
 */
function matchesRoute(pathname: string, pattern: string): boolean {
  // Convert route pattern to regex
  // /staff/[id] -> /staff/[^/]+
  const regexPattern = pattern
    .replace(/\[([^\]]+)\]/g, '[^/]+')
    .replace(/\//g, '\\/')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(pathname)
}

/**
 * Find matching route configuration for a pathname
 *
 * @param pathname - The request pathname
 * @returns Route config or undefined if no match
 */
function findRouteConfig(
  pathname: string
): { requiredRole?: string; authRequired: boolean } | undefined {
  // Try exact match first
  if (ROUTE_CONFIG[pathname]) {
    return ROUTE_CONFIG[pathname]
  }

  // Try pattern matching for dynamic routes
  for (const [pattern, config] of Object.entries(ROUTE_CONFIG)) {
    if (matchesRoute(pathname, pattern)) {
      return config
    }
  }

  return undefined
}

/**
 * Main middleware function
 *
 * Runs on every request to protected routes.
 * Validates authentication and role requirements.
 *
 * @param request - Next.js request object
 * @returns Next.js response (redirect to login if unauthorized, otherwise continue)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Find route configuration
  const routeConfig = findRouteConfig(pathname)

  // If route is not configured, allow access
  if (!routeConfig) {
    return NextResponse.next()
  }

  // If route doesn't require auth, allow access
  if (!routeConfig.authRequired) {
    return NextResponse.next()
  }

  // Get session token from cookies
  const token = getSessionFromRequest(request)

  // Validate session
  const session = await validateSession(token)

  // If no valid session, redirect to login
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If route requires a specific role, check it
  if (routeConfig.requiredRole) {
    if (!hasRole(session, routeConfig.requiredRole)) {
      // User doesn't have required role, redirect to unauthorized page
      const unauthorizedUrl = new URL('/unauthorized', request.url)
      return NextResponse.redirect(unauthorizedUrl)
    }
  }

  // User is authenticated and authorized, allow access
  return NextResponse.next()
}

/**
 * Middleware configuration
 * Specifies which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
