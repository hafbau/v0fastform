import { NextRequest, NextResponse } from 'next/server'
import { createClient, ChatDetail } from 'v0-sdk'
import { auth } from '@/app/(auth)/auth'
import {
  createChatOwnership,
  createAnonymousChatLog,
  getChatCountByUserId,
  getChatCountByIP,
  getAppById,
} from '@/lib/db/queries'
import {
  entitlementsByUserType,
  anonymousEntitlements,
} from '@/lib/entitlements'
import { ChatSDKError } from '@/lib/errors'

// Create v0 client with custom baseUrl if V0_API_URL is set
const v0 = createClient(
  process.env.V0_API_URL ? { baseUrl: process.env.V0_API_URL } : {},
)

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
    const { message, chatId, streaming, attachments, appId } =
      await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      )
    }

    // Validate appId for new authenticated chats - appId is REQUIRED for new chats
    if (!chatId && session?.user?.id) {
      if (!appId) {
        return NextResponse.json(
          { error: 'appId is required for new chats' },
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

    // Rate limiting
    if (session?.user?.id) {
      // Authenticated user rate limiting
      let chatCount = 0
      try {
        chatCount = await getChatCountByUserId({
          userId: session.user.id,
          differenceInHours: 24,
        })
      } catch (error) {
        console.error(
          'Rate limit check failed (user), skipping rate limiting:',
          error,
        )
      }

      const userType = session.user.type
      if (chatCount >= entitlementsByUserType[userType].maxMessagesPerDay) {
        return new ChatSDKError('rate_limit:chat').toResponse()
      }
    } else {
      // Anonymous user rate limiting
      const clientIP = getClientIP(request)
      let chatCount = 0
      try {
        chatCount = await getChatCountByIP({
          ipAddress: clientIP,
          differenceInHours: 24,
        })
      } catch (error) {
        console.error(
          'Rate limit check failed (anonymous), skipping rate limiting:',
          error,
        )
      }

      if (chatCount >= anonymousEntitlements.maxMessagesPerDay) {
        return new ChatSDKError('rate_limit:chat').toResponse()
      }
    }

    let chat

    if (chatId) {
      // continue existing chat
      if (streaming) {
        // Return streaming response for existing chat
        chat = await v0.chats.sendMessage({
          chatId: chatId,
          message,
          responseMode: 'experimental_stream',
          ...(attachments && attachments.length > 0 && { attachments }),
        })

        // Return the stream directly
        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      } else {
        // Non-streaming response for existing chat
        chat = await v0.chats.sendMessage({
          chatId: chatId,
          message,
          ...(attachments && attachments.length > 0 && { attachments }),
        })
      }
    } else {
      // create new chat
      if (streaming) {
        // Return streaming response
        // NOTE: For streaming new chats, ownership is created CLIENT-SIDE via the
        // handleChatData callback in home-client.tsx, which calls /api/chat/ownership
        // after receiving the chat ID from the stream. This is by design since we
        // cannot wait for stream completion server-side.
        chat = await v0.chats.create({
          message,
          responseMode: 'experimental_stream',
          ...(attachments && attachments.length > 0 && { attachments }),
        })

        // Return the stream directly
        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      } else {
        // Use sync mode
        chat = await v0.chats.create({
          message,
          responseMode: 'sync',
          ...(attachments && attachments.length > 0 && { attachments }),
        })
      }
    }

    // Type guard to ensure we have a ChatDetail and not a stream
    if (chat instanceof ReadableStream) {
      throw new Error('Unexpected streaming response')
    }

    const chatDetail = chat as ChatDetail

    // Create ownership mapping or anonymous log for new chat
    if (!chatId && chatDetail.id) {
      try {
        if (session?.user?.id) {
          // Authenticated user - create ownership mapping
          // appId is validated earlier in this route; it's required for new chats
          await createChatOwnership({
            v0ChatId: chatDetail.id,
            userId: session.user.id,
            appId,
          })
        } else {
          // Anonymous user - log for rate limiting
          const clientIP = getClientIP(request)
          await createAnonymousChatLog({
            ipAddress: clientIP,
            v0ChatId: chatDetail.id,
          })
        }
      } catch (error) {
        console.error('Failed to create chat ownership/log:', error)
        // Don't fail the request if database save fails
      }
    }

    return NextResponse.json({
      id: chatDetail.id,
      demo: chatDetail.demo,
      messages: chatDetail.messages?.map((msg) => ({
        ...msg,
        experimental_content: (msg as any).experimental_content,
      })),
    })
  } catch (error) {
    console.error('V0 API Error:', error)

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
