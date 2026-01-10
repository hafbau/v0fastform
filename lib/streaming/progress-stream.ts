/**
 * Progress Streaming Utility for AppSpec Processing
 *
 * This module provides utilities for streaming progress messages to the client
 * during multi-step operations like AppSpec regeneration and compilation.
 *
 * CRITICAL: Never mention internal systems (v0, AppSpec) to users.
 * All progress messages must be user-friendly.
 *
 * @module progress-stream
 */

/**
 * User-friendly progress messages for different stages of processing.
 * IMPORTANT: These messages are shown to end users - never expose internal terms.
 */
export const PROGRESS_MESSAGES = {
  UNDERSTANDING: 'Understanding your request...',
  UPDATING: 'Updating your app requirements...',
  PREPARING: 'Preparing to build...',
  BUILDING: 'Building your app...',
} as const

export type ProgressMessageType = keyof typeof PROGRESS_MESSAGES

/**
 * Creates a Server-Sent Events (SSE) formatted progress message.
 * Includes `event: progress` prefix for standard SSE compliance.
 *
 * @param message - The progress message to send
 * @returns SSE-formatted string
 */
export function createProgressEvent(message: string): string {
  return `event: progress\ndata: ${JSON.stringify({
    type: 'progress',
    message,
  })}\n\n`
}

/**
 * Creates an SSE-formatted error message.
 * Includes `event: error` prefix for standard SSE compliance.
 *
 * @param message - The error message to send
 * @returns SSE-formatted string
 */
export function createErrorEvent(message: string): string {
  return `event: error\ndata: ${JSON.stringify({
    type: 'error',
    message,
  })}\n\n`
}

/**
 * Creates a progress stream controller that can send progress messages
 * during async operations.
 *
 * @example
 * ```typescript
 * const { readable, sendProgress, sendError, pipeStream, close } = createProgressStreamController()
 *
 * // Start response immediately
 * const response = new Response(readable, { headers: sseHeaders })
 *
 * // Send progress
 * sendProgress(PROGRESS_MESSAGES.UNDERSTANDING)
 * await someOperation()
 * sendProgress(PROGRESS_MESSAGES.BUILDING)
 *
 * // Pipe the v0 stream when ready
 * await pipeStream(v0Stream)
 *
 * // Close when done
 * close()
 * ```
 */
export function createProgressStreamController() {
  const encoder = new TextEncoder()
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  writer = writable.getWriter()

  return {
    readable,

    /**
     * Sends a progress message to the client.
     */
    async sendProgress(message: string): Promise<void> {
      if (writer) {
        await writer.write(encoder.encode(createProgressEvent(message)))
      }
    },

    /**
     * Sends an error message to the client.
     */
    async sendError(message: string): Promise<void> {
      if (writer) {
        await writer.write(encoder.encode(createErrorEvent(message)))
      }
    },

    /**
     * Pipes another ReadableStream through to the client.
     * Useful for piping v0's response stream after sending progress messages.
     */
    async pipeStream(stream: ReadableStream<Uint8Array>): Promise<void> {
      if (!writer) return

      const reader = stream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            await writer.write(value)
          }
        }
      } finally {
        reader.releaseLock()
      }
    },

    /**
     * Writes raw data to the stream.
     */
    async write(data: Uint8Array): Promise<void> {
      if (writer) {
        await writer.write(data)
      }
    },

    /**
     * Closes the stream.
     */
    async close(): Promise<void> {
      if (writer) {
        await writer.close()
        writer = null
      }
    },
  }
}

/**
 * Standard SSE headers for streaming responses.
 */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

/**
 * Helper to run an async operation while streaming progress at intervals.
 *
 * @param operation - The async operation to run
 * @param controller - The progress stream controller
 * @param messages - Array of progress messages to cycle through
 * @param intervalMs - How often to send progress messages (default: 800ms)
 * @returns The result of the operation
 */
export async function runWithProgress<T>(
  operation: Promise<T>,
  controller: ReturnType<typeof createProgressStreamController>,
  messages: string[] = Object.values(PROGRESS_MESSAGES),
  intervalMs: number = 800,
): Promise<T> {
  let index = 0

  const interval = setInterval(async () => {
    if (index < messages.length) {
      await controller.sendProgress(messages[index])
      index++
    }
  }, intervalMs)

  try {
    return await operation
  } finally {
    clearInterval(interval)
  }
}
