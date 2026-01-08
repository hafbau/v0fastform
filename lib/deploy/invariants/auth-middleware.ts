/**
 * Fastform Authentication Middleware
 *
 * Validates JWT tokens and sessions for authenticated routes.
 * Used by the main middleware to protect staff-only pages.
 *
 * This file is automatically injected into all generated apps.
 *
 * @module auth-middleware
 */

/**
 * Session payload structure from JWT
 */
export interface SessionPayload {
  /** User ID */
  userId: string
  /** User email */
  email: string
  /** User role(s) */
  roles: string[]
  /** Organization ID */
  orgId: string
  /** Token expiration timestamp */
  exp: number
}

/**
 * JWT verification error
 */
export class SessionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionValidationError'
  }
}

/**
 * Get the JWT secret for token verification
 * Falls back to a default development secret if not set
 */
function getJwtSecret(): string {
  const secret = process.env.FASTFORM_JWT_SECRET

  if (!secret) {
    // In development, use a known development secret
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Auth] FASTFORM_JWT_SECRET not set, using development default'
      )
      return 'dev-secret-change-in-production'
    }

    throw new Error('FASTFORM_JWT_SECRET environment variable is required')
  }

  return secret
}

/**
 * Decode a JWT token without verification (for inspection)
 *
 * @param token - The JWT token string
 * @returns Decoded payload or null if invalid
 */
function decodeToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded) as SessionPayload
  } catch {
    return null
  }
}

/**
 * Verify JWT signature using HMAC SHA-256
 *
 * @param token - The JWT token string
 * @param secret - The secret key
 * @returns True if signature is valid
 */
async function verifySignature(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const [header, payload, signature] = parts
    const message = `${header}.${payload}`

    // Import crypto for HMAC verification
    const crypto = await import('crypto')

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(message)
    const expectedSignature = hmac
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    return signature === expectedSignature
  } catch {
    return false
  }
}

/**
 * Validate a session token and return the user payload
 *
 * @param token - JWT token string from cookie
 * @returns Session payload if valid, null if invalid or expired
 *
 * @example
 * ```typescript
 * const token = cookies.get('fastform_session')
 * const session = await validateSession(token)
 *
 * if (!session) {
 *   return NextResponse.redirect('/login')
 * }
 *
 * // User is authenticated
 * console.log(session.userId, session.email)
 * ```
 */
export async function validateSession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) {
    return null
  }

  // Decode token
  const payload = decodeToken(token)
  if (!payload) {
    return null
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    return null
  }

  // Verify signature
  const secret = getJwtSecret()
  const isValid = await verifySignature(token, secret)

  if (!isValid) {
    return null
  }

  return payload
}

/**
 * Check if a session has a specific role
 *
 * @param session - Session payload from validateSession
 * @param requiredRole - Role to check for
 * @returns True if user has the role
 *
 * @example
 * ```typescript
 * const session = await validateSession(token)
 * if (session && hasRole(session, 'STAFF')) {
 *   // Allow access to staff pages
 * }
 * ```
 */
export function hasRole(
  session: SessionPayload,
  requiredRole: string
): boolean {
  return session.roles.includes(requiredRole)
}

/**
 * Extract session from request cookies
 *
 * @param request - Next.js request object
 * @returns Session token or undefined
 */
export function getSessionFromRequest(
  request: { cookies: { get: (name: string) => { value: string } | undefined } }
): string | undefined {
  const cookie = request.cookies.get('fastform_session')
  return cookie?.value
}
