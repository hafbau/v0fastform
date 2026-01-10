'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import useSWR, { mutate } from 'swr'
import { ChatInput } from '@/components/chat/chat-input'
import IntentConfirmation from '@/components/chat/intent-confirmation'
import { AuthRequiredModal } from '@/components/shared/auth-required-modal'
import { type ImageAttachment } from '@/components/ai-elements/prompt-input'
import { generateAppName } from '@/lib/utils/generate-app-name'
import type { FastformAppSpec } from '@/lib/types/appspec'

interface App {
  id: string
  userId: string
  name: string
  createdAt: string
}

interface AppsResponse {
  data: App[]
}

export function AppsListClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAuthenticated = status === 'authenticated' && !!session?.user

  // Only fetch apps if authenticated
  const { data, error, isLoading } = useSWR<AppsResponse>(
    isAuthenticated ? '/api/apps' : null
  )
  const apps = data?.data || []

  // Chat input state
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Intent confirmation (draft AppSpec) state
  const [draftSpec, setDraftSpec] = useState<FastformAppSpec | null>(null)
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null)
  const [draftAppId, setDraftAppId] = useState<string | null>(null)
  const [lastUserIntent, setLastUserIntent] = useState<string | null>(null)
  const [lastIntentAttachments, setLastIntentAttachments] = useState<
    Array<{ url: string }> | undefined
  >(undefined)

  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Delete "${appName}"? This will also delete all chats in this app.`)) {
      return
    }

    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        mutate('/api/apps')
      }
    } catch (error) {
      console.error('Failed to delete app:', error)
    }
  }

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    submittedAttachments?: Array<{ url: string }>
  ) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return

    // Gate anonymous users
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    setIsSubmitting(true)
    const userMessage = message.trim()

    try {
      // If we're currently in the intent-confirmation flow, reuse the same app and session
      // to refine the draft spec instead of creating a new app.
      let appId = draftAppId
      let sessionId = draftSessionId

      if (!appId) {
        // 1. Create app with name from message
        const appName = generateAppName(userMessage)
        const appResponse = await fetch('/api/apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: appName }),
        })

        if (!appResponse.ok) {
          throw new Error('Failed to create app')
        }

        const appData = await appResponse.json()
        appId = appData.data.id
        setDraftAppId(appId)

        // Refresh app list so the newly created app shows up immediately
        mutate('/api/apps')
      }

      if (!appId) {
        throw new Error('Could not determine app ID')
      }

      // 2. Create chat with the message (non-streaming to get chatId directly)
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          appId,
          sessionId,
          streaming: false,
          attachments: submittedAttachments,
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat')
      }

      const chatData = await chatResponse.json()

      // NEW: Intent confirmation flow (no chat id yet)
      if (chatData.type === 'intent-confirmation') {
        setDraftSpec(chatData.draftSpec)
        setDraftSessionId(chatData.sessionId)
        setLastUserIntent(userMessage)
        setLastIntentAttachments(submittedAttachments)
        setMessage('')
        setAttachments([])
        setIsSubmitting(false)
        return
      }

      const chatId = chatData.id

      if (!chatId) {
        throw new Error('Could not get chat ID from response')
      }

      // 3. Clear message and redirect
      setMessage('')
      setAttachments([])
      setDraftSpec(null)
      setDraftSessionId(null)
      setDraftAppId(null)
      setLastUserIntent(null)
      setLastIntentAttachments(undefined)
      router.push(`/apps/${appId}/chats/${chatId}`)
    } catch (error) {
      console.error('Error creating app and chat:', error)
      setIsSubmitting(false)
    }
  }

  const handleConfirmDraftSpec = async (editedSpec: FastformAppSpec) => {
    if (!draftAppId || !draftSessionId || !lastUserIntent) {
      console.error('Missing draft state for confirmation')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Persist the AppSpec
      const response = await fetch(`/api/apps/${draftAppId}/appspec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: editedSpec,
          sessionId: draftSessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to persist AppSpec')
      }

      // 2. Create the actual v0 chat (AppSpec is now persisted, so /api/chat will use v0 flow)
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastUserIntent,
          appId: draftAppId,
          streaming: false,
          attachments: lastIntentAttachments,
        }),
      })

      if (!chatResponse.ok) {
        throw new Error('Failed to create chat after confirming AppSpec')
      }

      const chatData = await chatResponse.json()
      const chatId = chatData.id
      if (!chatId) {
        throw new Error('Could not get chat ID from response')
      }

      // 3. Clear draft state and redirect
      setDraftSpec(null)
      setDraftSessionId(null)
      setDraftAppId(null)
      setLastUserIntent(null)
      setLastIntentAttachments(undefined)
      setIsSubmitting(false)
      router.push(`/apps/${draftAppId}/chats/${chatId}`)
    } catch (error) {
      console.error('Error confirming AppSpec:', error)
      setIsSubmitting(false)
    }
  }

  const handleRefineDraftSpec = () => {
    setIsSubmitting(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chat Input Section - Always visible */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              What would you like to build?
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Describe your idea and we&apos;ll help you create it
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

        {/* Intent confirmation (draft AppSpec) */}
        {draftSpec && (
          <div className="mb-12 max-w-4xl mx-auto">
            <IntentConfirmation
              draftSpec={draftSpec}
              onConfirm={handleConfirmDraftSpec}
              onRefine={handleRefineDraftSpec}
            />
          </div>
        )}

        {/* Apps Section - Only show if authenticated and has apps */}
        {isAuthenticated && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  Loading apps...
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error loading apps
                    </h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      {error.message || 'Failed to load apps'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !error && apps.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Your Apps
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="group relative border border-border dark:border-input rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
                    >
                      <Link
                        href={`/apps/${app.id}/chats`}
                        className="block"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {app.name}
                            </h4>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              Created{' '}
                              {new Date(app.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleDeleteApp(app.id, app.name)
                        }}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete app"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthRequiredModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </div>
  )
}
