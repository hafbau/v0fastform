import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { createChatOwnership, createAnonymousChatLog, getAppById } from '@/lib/db/queries'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  // Fallback to connection remote address or unknown
  return 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const { chatId, appId } = await request.json()

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 },
      )
    }

    // Validate appId for authenticated users - appId is REQUIRED
    if (session?.user?.id) {
      if (!appId) {
        return NextResponse.json(
          { error: 'appId is required for authenticated users' },
          { status: 400 },
        )
      }
      const app = await getAppById({ appId })
      if (!app) {
        return NextResponse.json(
          { error: 'App not found' },
          { status: 404 },
        )
      }
      if (app.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Forbidden - you do not own this app' },
          { status: 403 },
        )
      }
    }

    if (session?.user?.id) {
      // Authenticated user - create ownership mapping
      // appId is validated above; it's required for authenticated users
      await createChatOwnership({
        v0ChatId: chatId,
        userId: session.user.id,
        appId,
      })
    } else {
      // Anonymous user - log for rate limiting
      const clientIP = getClientIP(request)
      await createAnonymousChatLog({
        ipAddress: clientIP,
        v0ChatId: chatId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to create chat ownership/log:', error)
    return NextResponse.json(
      { error: 'Failed to create ownership record' },
      { status: 500 },
    )
  }
}
