/**
 * Utility to parse progress events from an SSE stream
 *
 * Standard SSE format:
 *   event: progress
 *   data: {"type":"progress","message":"..."}
 *
 * This creates a transformed stream that:
 * 1. Extracts progress events (identified by `event: progress`) and calls onProgress
 * 2. Extracts error events (identified by `event: error`) and calls onError
 * 3. Passes through all other content (v0 SDK events) unchanged
 *
 * Also handles legacy format without event prefix for backwards compatibility.
 */

interface ProgressEvent {
  type: 'progress' | 'error'
  message: string
}

export function createProgressFilteredStream(
  sourceStream: ReadableStream<Uint8Array>,
  onProgress: (message: string) => void,
  onError?: (message: string) => void
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      const reader = sourceStream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            // Flush any remaining buffer
            if (buffer.trim()) {
              controller.enqueue(encoder.encode(buffer))
            }
            controller.close()
            break
          }

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE events
          const events = buffer.split('\n\n')

          // Keep incomplete event in buffer
          buffer = events.pop() || ''

          for (const event of events) {
            if (!event.trim()) continue

            // Check if this is a progress event
            if (event.startsWith('event: progress') || event.includes('\nevent: progress')) {
              // Extract the data line
              const lines = event.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6)) as ProgressEvent
                    if (data.type === 'progress') {
                      onProgress(data.message)
                    } else if (data.type === 'error' && onError) {
                      onError(data.message)
                    }
                  } catch {
                    // Not valid JSON, ignore
                  }
                }
              }
              // Don't pass progress events downstream
              continue
            }

            // Check if this is an error event
            if (event.startsWith('event: error') || event.includes('\nevent: error')) {
              const lines = event.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6)) as ProgressEvent
                    if (data.type === 'error' && onError) {
                      onError(data.message)
                    }
                  } catch {
                    // Not valid JSON, ignore
                  }
                }
              }
              // Don't pass error events downstream
              continue
            }

            // Pass through non-progress events (v0 SDK content)
            controller.enqueue(encoder.encode(event + '\n\n'))
          }
        }
      } catch (error) {
        controller.error(error)
      }
    },

    cancel() {
      // Clean up if the stream is cancelled
    },
  })
}
