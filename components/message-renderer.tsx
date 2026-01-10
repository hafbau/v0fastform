import React from 'react'
import { Message, MessageBinaryFormat } from '@v0-sdk/react'
import { sharedComponents } from './shared-components'

// Debug flag - temporarily enabled to debug questionnaire detection
// TODO: Revert to process.env.NODE_ENV === 'development' after debugging
const DEBUG_MESSAGES = true

/**
 * Recursively extract all text from MessageBinaryFormat content
 * Handles various v0 message structures
 */
function extractAllText(content: unknown): string[] {
  const texts: string[] = []

  if (typeof content === 'string') {
    if (content.trim()) texts.push(content.trim())
    return texts
  }

  if (!Array.isArray(content)) return texts

  for (const item of content) {
    if (typeof item === 'string' && item.trim()) {
      texts.push(item.trim())
    } else if (Array.isArray(item)) {
      // Recursively extract from nested arrays
      texts.push(...extractAllText(item))
    } else if (item && typeof item === 'object') {
      // Extract from objects (e.g., { text: "..." } or { content: "..." })
      if ('text' in item && typeof item.text === 'string') {
        texts.push(item.text.trim())
      }
      if ('content' in item && typeof item.content === 'string') {
        texts.push(item.content.trim())
      }
      if ('message' in item && typeof item.message === 'string') {
        texts.push(item.message.trim())
      }
      // Also check nested children/parts
      if ('children' in item) {
        texts.push(...extractAllText(item.children))
      }
      if ('parts' in item) {
        texts.push(...extractAllText(item.parts))
      }
    }
  }

  return texts.filter((t) => t.length > 0)
}

/**
 * Detect if content looks like a questionnaire from v0
 * and extract the question text for simple display.
 *
 * This is a fallback for rare cases where v0 returns questionnaire-style
 * content despite receiving an AppSpec-compiled prompt.
 */
function extractQuestionnaireText(content: MessageBinaryFormat): string | null {
  if (!Array.isArray(content)) return null

  // Debug: Always log when checking for questionnaires in development
  if (DEBUG_MESSAGES) {
    console.log('[MessageRenderer] Checking for questionnaire in content:', JSON.stringify(content, null, 2))
  }

  // Extract all text from the content (recursively)
  const allTexts = extractAllText(content)
  const fullText = allTexts.join('\n')

  if (DEBUG_MESSAGES) {
    console.log('[MessageRenderer] Extracted texts:', allTexts)
    console.log('[MessageRenderer] Full text:', fullText)
  }

  if (!fullText) return null

  // Questionnaire patterns to detect
  const questionnairePatterns = [
    /\d+\.\s+\*\*[^*]+\*\*/m, // Numbered bold items like "1. **Option Name**"
    /\d+\.\s+[A-Z][^.?!]*\?/m, // Numbered questions
    /Option [A-Z]/i, // "Option A", "Option B"
    /Would you (?:like|prefer)/i,
    /Please (?:select|choose|let me know)/i,
    /Which (?:one|option|would you)/i,
    /Choose (?:one|from|between)/i,
    /\[ \]/g, // Checkbox patterns like "[ ]"
    /\(\s*\)/g, // Radio button patterns like "( )"
    /what (?:type|kind|style)/i,
    /before I (?:proceed|continue|start)/i,
    /I'd like to (?:clarify|understand|know)/i,
    /Could you (?:clarify|tell|specify)/i,
    /Let me know if you/i,
    /do you (?:want|need|prefer)/i,
  ]

  let matchCount = 0
  const matchedPatterns: string[] = []

  for (const pattern of questionnairePatterns) {
    if (pattern.test(fullText)) {
      matchCount++
      matchedPatterns.push(pattern.source)
    }
  }

  if (DEBUG_MESSAGES) {
    console.log('[MessageRenderer] Questionnaire pattern matches:', matchCount, matchedPatterns)
  }

  // Only treat as questionnaire if we found at least 2 patterns
  if (matchCount >= 2) {
    return fullText
  }

  return null
}

// Function to preprocess message content and remove V0_FILE markers and shell placeholders
function preprocessMessageContent(
  content: MessageBinaryFormat,
): MessageBinaryFormat {
  if (!Array.isArray(content)) return content

  // Debug: Log the raw content structure
  if (DEBUG_MESSAGES) {
    console.log('[MessageRenderer] Raw content structure:', JSON.stringify(content, null, 2))
  }

  const processed = content.map((row) => {
    if (!Array.isArray(row)) return row

    // Process text content to remove V0_FILE markers and shell placeholders
    return row.map((item) => {
      if (typeof item === 'string') {
        // Remove V0_FILE markers with various patterns
        let processed = item.replace(/\[V0_FILE\][^:]*:file="[^"]*"\n?/g, '')
        processed = processed.replace(/\[V0_FILE\][^\n]*\n?/g, '')

        // Remove shell placeholders with various patterns
        processed = processed.replace(/\.\.\. shell \.\.\./g, '')
        processed = processed.replace(/\.\.\.\s*shell\s*\.\.\./g, '')

        // Remove empty lines that might be left behind
        processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n')
        processed = processed.replace(/^\s*\n+/g, '') // Remove leading empty lines
        processed = processed.replace(/\n+\s*$/g, '') // Remove trailing empty lines
        processed = processed.trim()

        // If the processed string is empty or only whitespace, return empty string
        if (!processed || processed.match(/^\s*$/)) {
          return ''
        }

        return processed
      }
      return item
    }) as [number, ...unknown[]] // Type assertion to match MessageBinaryFormat structure
  })

  // Filter out rows that are completely empty (all string content is empty)
  const filtered = processed.filter((row) => {
    if (!Array.isArray(row)) return true
    // Keep rows that have at least one non-empty string or non-string content
    const hasContent = row.slice(1).some((item) => {
      if (typeof item === 'string') return item.length > 0
      if (typeof item === 'object' && item !== null) return true
      return false
    })
    return hasContent
  })

  if (DEBUG_MESSAGES) {
    console.log('[MessageRenderer] Processed content:', JSON.stringify(filtered, null, 2))
  }

  return filtered as MessageBinaryFormat
}

interface MessageRendererProps {
  content: MessageBinaryFormat | string
  messageId?: string
  role: 'user' | 'assistant'
  className?: string
}

export function MessageRenderer({
  content,
  messageId,
  role,
  className,
}: MessageRendererProps) {
  // If content is a string (user message or fallback), render it as plain text
  if (typeof content === 'string') {
    return (
      <div className={className}>
        <p className="mb-4 text-gray-700 dark:text-gray-200 leading-relaxed">
          {content}
        </p>
      </div>
    )
  }

  // If content is MessageBinaryFormat (from v0 API), use the Message component
  // First check if this looks like questionnaire content (fallback for rare edge cases)
  const questionnaireText = extractQuestionnaireText(content)

  if (questionnaireText) {
    // Render questionnaire content as simple styled text instead of interactive UI
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4 ${className || ''}`}>
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-2 font-medium">
          We need a bit more information:
        </p>
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {questionnaireText}
        </div>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
          Please reply with your preferences.
        </p>
      </div>
    )
  }

  // Preprocess content to remove V0_FILE markers and shell placeholders
  const processedContent = preprocessMessageContent(content)

  // If processed content is empty, show a fallback
  if (!processedContent || processedContent.length === 0) {
    if (DEBUG_MESSAGES) {
      console.log('[MessageRenderer] Content empty after processing, showing raw:', content)
    }
    // Try to render raw content without processing
    return (
      <Message
        content={content}
        messageId={messageId}
        role={role}
        className={className}
        components={sharedComponents}
      />
    )
  }

  return (
    <Message
      content={processedContent}
      messageId={messageId}
      role={role}
      className={className}
      components={sharedComponents}
    />
  )
}
