'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { ChatInput } from '@/components/chat/chat-input'
import { type ImageAttachment } from '@/components/ai-elements/prompt-input'

interface V0Chat {
  id: string
  object: 'chat'
  name?: string
  messages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  createdAt: string
  updatedAt: string
}

interface ChatsResponse {
  object: 'list'
  data: V0Chat[]
}

interface ChatsClientProps {
  appId: string
}

export function ChatsClient({ appId }: ChatsClientProps) {
  const router = useRouter()
  const { data, error, isLoading: isLoadingChats } = useSWR<ChatsResponse>(
    `/api/chats?appId=${appId}`
  )
  const chats = data?.data || []

  // Chat input state
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getFirstUserMessage = (chat: V0Chat) => {
    const firstUserMessage = chat.messages?.find((msg) => msg.role === 'user')
    return firstUserMessage?.content || 'No messages'
  }

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    submittedAttachments?: Array<{ url: string }>
  ) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    setIsSubmitting(true)
    const userMessage = message.trim()

    try {
      // Create chat with the message under this app (non-streaming to get chatId directly)
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          appId,
          streaming: false,
          attachments: submittedAttachments,
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat')
      }

      const chatData = await chatResponse.json()
      const chatId = chatData.id

      if (!chatId) {
        throw new Error('Could not get chat ID from response')
      }

      // Clear message and redirect
      setMessage('')
      setAttachments([])
      router.push(`/apps/${appId}/chats/${chatId}`)
    } catch (error) {
      console.error('Error creating chat:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chat Input Section - Always visible */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Start a new conversation
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Describe what you&apos;d like to build or continue working on
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <ChatInput
              message={message}
              setMessage={setMessage}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              showSuggestions={true}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              textareaRef={textareaRef}
            />
          </div>
        </div>

        {/* Chats Section */}
        {isLoadingChats && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">
              Loading chats...
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading chats
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error.message || 'Failed to load chats'}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoadingChats && !error && chats.length > 0 && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Previous Chats
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {chats.length} {chats.length === 1 ? 'chat' : 'chats'}
              </p>
            </div>
            <div className="space-y-3">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/apps/${appId}/chats/${chat.id}`}
                  className="group block"
                >
                  <div className="border border-border dark:border-input rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {chat.name || getFirstUserMessage(chat)}
                        </h4>
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span>{chat.messages?.length || 0} messages</span>
                          <span>
                            Updated {new Date(chat.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
