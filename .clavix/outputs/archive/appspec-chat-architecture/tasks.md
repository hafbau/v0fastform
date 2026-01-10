# Implementation Tasks: AppSpec Chat Architecture Fix

*Generated from PRD on 2026-01-09*

---

## Overview

This task breakdown implements the AppSpec-first chat architecture, ensuring no user message ever bypasses requirement transformation before code generation.

**Total Tasks:** 12
**Estimated Complexity:** Medium-High
**Dependencies:** Sequential phases, tasks within phases can be parallelized

---

## Phase 1: Fix Critical Bugs (Blocking Issues)

### Task 1.1: Handle intent-confirmation in home-client.tsx

**File:** `components/home/home-client.tsx`
**Lines:** 246-262
**Priority:** HIGH (Blocking)

**Problem:** After `fetch('/api/chat')`, code assumes response is always a stream. When API returns `{ type: 'intent-confirmation' }`, it's incorrectly treated as a stream.

**Implementation:**
```typescript
// After line 246: if (!response.body) { throw new Error('No response body') }

// Check Content-Type to distinguish JSON from stream
const contentType = response.headers.get('Content-Type') || ''

if (contentType.includes('application/json')) {
  // Handle intent-confirmation response
  const data = await response.json()

  if (data.type === 'intent-confirmation') {
    setDraftSpec(data.draftSpec)
    setSessionId(data.sessionId)
    setShowIntentConfirmation(true)
    setIsLoading(false)
    return  // Don't treat as stream
  }
}

// Existing streaming logic continues here...
```

**Reference:** See correct implementation in `components/chats/chat-detail-client.tsx:354-369`

**Acceptance Criteria:**
- [x] JSON responses with `type: 'intent-confirmation'` are parsed correctly
- [x] `draftSpec`, `sessionId` state is set
- [x] Intent confirmation UI is shown
- [x] No "stream" errors for JSON responses

---

### Task 1.2: Remove dangerous fallback in route.ts

**File:** `app/api/chat/route.ts`
**Lines:** 204-210
**Priority:** HIGH (Security)

**Problem:** Current code falls through to v0 SDK if AppSpec generation fails unexpectedly. This bypasses the AppSpec-first architecture.

**Current Code (to remove):**
```typescript
// For unexpected errors, fall through to existing v0 SDK flow
// This provides a graceful degradation path
console.warn(
  'AppSpec generation failed unexpectedly, falling back to v0 SDK flow:',
  error,
)
```

**Implementation:**
```typescript
// Replace fallback with explicit error response
return NextResponse.json(
  {
    error: 'appspec_generation_failed',
    message: 'We encountered an issue understanding your request. Please try rephrasing or simplifying your description.',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  },
  { status: 500 }
)
```

**Acceptance Criteria:**
- [x] No code path falls through to raw v0 SDK
- [x] User sees friendly error message
- [x] Dev environment shows error details for debugging

---

## Phase 2: Implement AppSpec Regeneration Flow

### Task 2.1: Add AppSpec regeneration for follow-up messages

**File:** `app/api/chat/route.ts`
**After:** Line 260 (where chatId exists)
**Priority:** HIGH

**Problem:** When user sends follow-up messages (chatId exists), raw message goes to v0 without AppSpec context.

**Implementation:**
```typescript
if (chatId) {
  // === NEW: AppSpec Regeneration Flow ===

  // 1. Fetch existing AppSpec from DB
  const app = await getAppByChatId(chatId)
  const existingSpec = app?.spec as FastformAppSpec | null

  if (existingSpec && isValidAppSpec(existingSpec)) {
    try {
      // 2. Regenerate AppSpec with new user message
      const updatedSpec = await regenerateAppSpec(existingSpec, message)

      // 3. Persist updated AppSpec to DB
      await updateAppSpec(app.id, updatedSpec)

      // 4. Compile to detailed prompt
      const compiledPrompt = compileAppSpecToPrompt(updatedSpec)

      // 5. Send compiled prompt to v0 (not raw message)
      const enrichedMessage = `[CONTEXT: User is refining their app]\n\n${compiledPrompt}\n\n[USER'S LATEST REQUEST]: ${message}`

      // Continue with v0 SDK using enrichedMessage instead of raw message
      chat = await v0.chats.sendMessage({
        chatId: chatId,
        message: enrichedMessage,  // Use enriched message
        responseMode: streaming ? 'experimental_stream' : undefined,
        ...(attachments && attachments.length > 0 && { attachments }),
      })

      // ... rest of response handling
    } catch (error) {
      console.error('AppSpec regeneration failed:', error)
      // Show user-friendly error, don't fall through
      return NextResponse.json({
        error: 'appspec_update_failed',
        message: 'We had trouble updating your app requirements. Please try again.',
      }, { status: 500 })
    }
  }
  // ... existing flow for non-AppSpec chats
}
```

**New Functions Needed:**
- `getAppByChatId(chatId: string): Promise<App | null>` - Query apps table by chatId
- `updateAppSpec(appId: string, spec: FastformAppSpec): Promise<void>` - Update apps.spec column

**Acceptance Criteria:**
- [x] Follow-up messages regenerate AppSpec
- [x] Updated AppSpec is persisted to database
- [x] Compiled prompt is sent to v0 (not raw message)
- [x] v0 receives full context, doesn't ask unnecessary questions

---

### Task 2.2: Add database helper functions

**File:** `lib/db/queries.ts` (new functions)
**Priority:** HIGH (Dependency for 2.1)

**Implementation:**
```typescript
/**
 * Get app by its associated chat ID
 */
export async function getAppByChatId(chatId: string): Promise<App | null> {
  const result = await db
    .select()
    .from(apps)
    .where(eq(apps.chatId, chatId))
    .limit(1)

  return result[0] || null
}

/**
 * Update an app's AppSpec
 */
export async function updateAppSpec(
  appId: string,
  spec: FastformAppSpec
): Promise<void> {
  await db
    .update(apps)
    .set({
      spec: spec,
      updatedAt: new Date()
    })
    .where(eq(apps.id, appId))
}
```

**Acceptance Criteria:**
- [x] `getAppByChatId` returns app with spec column
- [x] `updateAppSpec` persists JSON correctly
- [x] Functions are exported and imported in route.ts

---

### Task 2.3: Import compileAppSpecToPrompt in route.ts

**File:** `app/api/chat/route.ts`
**Location:** Top imports section
**Priority:** MEDIUM

**Current State:** `compileAppSpecToPrompt` exists in `lib/compiler/appspec-to-prompt.ts` but is only used in deployment flow.

**Implementation:**
```typescript
// Add to imports
import { compileAppSpecToPrompt } from '@/lib/compiler/appspec-to-prompt'
```

**Acceptance Criteria:**
- [x] Import added without TypeScript errors
- [x] Function is callable in the chat flow

---

## Phase 3: Add Progress Streaming

### Task 3.1: Create progress streaming utility

**File:** `lib/streaming/progress-stream.ts` (new file)
**Priority:** MEDIUM

**Implementation:**
```typescript
/**
 * Progress messages to stream during AppSpec processing.
 * CRITICAL: Never mention internal systems (v0, AppSpec) to users.
 */
const PROGRESS_MESSAGES = [
  'Understanding your request...',
  'Updating your app requirements...',
  'Preparing to build...',
  'Building your app...',
] as const

/**
 * Creates a TransformStream that prepends progress messages
 * before the actual v0 stream content.
 */
export function createProgressStream(
  v0Stream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let progressIndex = 0
  let progressSent = false

  return new TransformStream<Uint8Array, Uint8Array>({
    async start(controller) {
      // Send initial progress message
      const progressEvent = `data: ${JSON.stringify({
        type: 'progress',
        message: PROGRESS_MESSAGES[0],
      })}\n\n`
      controller.enqueue(encoder.encode(progressEvent))
    },

    transform(chunk, controller) {
      // Forward v0 stream chunks
      controller.enqueue(chunk)
    }
  }).readable
}

/**
 * Stream progress updates at intervals during long operations
 */
export async function streamProgressDuring<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  operation: Promise<T>,
  messages: string[] = [...PROGRESS_MESSAGES]
): Promise<T> {
  const encoder = new TextEncoder()
  let index = 0

  const interval = setInterval(() => {
    if (index < messages.length) {
      const event = `data: ${JSON.stringify({
        type: 'progress',
        message: messages[index],
      })}\n\n`
      controller.enqueue(encoder.encode(event))
      index++
    }
  }, 800)  // Send progress every 800ms

  try {
    return await operation
  } finally {
    clearInterval(interval)
  }
}
```

**Acceptance Criteria:**
- [x] Progress messages are user-friendly (no internal terms)
- [x] SSE format compatible with frontend
- [x] Graceful handling when operation completes quickly

---

### Task 3.2: Integrate progress streaming in route.ts

**File:** `app/api/chat/route.ts`
**Location:** AppSpec regeneration flow
**Priority:** MEDIUM

**Implementation:**
```typescript
// In the AppSpec regeneration block (Task 2.1)

// Create a custom stream for progress + v0 response
const { readable, writable } = new TransformStream()
const writer = writable.getWriter()
const encoder = new TextEncoder()

// Start streaming response immediately
const response = new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  },
})

// Process in background
(async () => {
  try {
    // Progress: Understanding
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ type: 'progress', message: 'Understanding your request...' })}\n\n`
    ))

    // Regenerate AppSpec
    const updatedSpec = await regenerateAppSpec(existingSpec, message)

    // Progress: Updating
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ type: 'progress', message: 'Updating your app requirements...' })}\n\n`
    ))

    // Persist to DB
    await updateAppSpec(app.id, updatedSpec)

    // Progress: Preparing
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ type: 'progress', message: 'Preparing to build...' })}\n\n`
    ))

    // Compile and send to v0
    const compiledPrompt = compileAppSpecToPrompt(updatedSpec)

    // Progress: Building
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ type: 'progress', message: 'Building your app...' })}\n\n`
    ))

    // Get v0 stream and pipe through
    const v0Stream = await v0.chats.sendMessage({
      chatId,
      message: compiledPrompt,
      responseMode: 'experimental_stream',
    })

    // Pipe v0 stream to our response
    const reader = v0Stream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await writer.write(value)
    }
  } catch (error) {
    await writer.write(encoder.encode(
      `data: ${JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' })}\n\n`
    ))
  } finally {
    await writer.close()
  }
})()

return response
```

**Acceptance Criteria:**
- [x] Progress messages appear before v0 content
- [x] Stream doesn't break on errors
- [x] v0 stream content flows through correctly

---

### Task 3.3: Handle progress messages in frontend

**File:** `hooks/use-chat.ts` or `components/home/home-client.tsx`
**Priority:** MEDIUM

**Implementation:**
```typescript
// In the streaming message handler
const handleStreamEvent = (event: string) => {
  const data = JSON.parse(event)

  if (data.type === 'progress') {
    // Update UI with progress message
    setProgressMessage(data.message)
    return
  }

  if (data.type === 'error') {
    setError(data.message)
    return
  }

  // Handle normal v0 content
  // ... existing logic
}
```

**Acceptance Criteria:**
- [x] Progress messages display in UI
- [x] Progress clears when content starts
- [x] Error messages display gracefully

---

## Phase 4: Fallback UI for Questionnaire Content

### Task 4.1: Add questionnaire content detector

**File:** `components/message-renderer.tsx`
**Priority:** MEDIUM

**Problem:** If v0 returns questionnaire-style content (shouldn't happen with AppSpec, but fallback needed), extract text and present simply.

**Implementation:**
```typescript
/**
 * Detect if content looks like a questionnaire from v0
 * and extract the question text for simple display.
 */
function extractQuestionnaireText(content: MessageBinaryFormat): string | null {
  // Look for patterns that indicate questionnaire content
  // v0's questionnaire format includes numbered options

  const textParts: string[] = []

  for (const part of content) {
    const [type, ...data] = part

    // Type 1 is typically text content
    if (type === 1 && typeof data[0] === 'string') {
      const text = data[0]

      // Check for questionnaire patterns
      if (
        text.includes('1.') ||
        text.includes('Option A') ||
        text.includes('Would you prefer') ||
        text.includes('Please select')
      ) {
        textParts.push(text)
      }
    }
  }

  return textParts.length > 0 ? textParts.join('\n\n') : null
}
```

**Acceptance Criteria:**
- [x] Questionnaire patterns are detected
- [x] Text is extracted without interactive UI
- [x] Normal content passes through unchanged

---

### Task 4.2: Render fallback questionnaire UI

**File:** `components/message-renderer.tsx`
**Priority:** MEDIUM

**Implementation:**
```typescript
// In MessageRenderer component

const questionnaireText = extractQuestionnaireText(content)

if (questionnaireText) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800 mb-2">
        We need a bit more information:
      </p>
      <div className="text-gray-700 whitespace-pre-wrap">
        {questionnaireText}
      </div>
      <p className="text-sm text-amber-600 mt-3">
        Please reply with your preferences.
      </p>
    </div>
  )
}

// Continue with normal rendering...
```

**Acceptance Criteria:**
- [x] Questionnaire content renders as simple text
- [x] UI is styled distinctly (not like normal chat)
- [x] User can respond naturally in chat

---

## Phase 5: Testing & Validation

### Task 5.1: Update existing tests

**File:** `app/api/chat/__tests__/route.appspec.test.ts`
**Priority:** HIGH

**Tests to Add/Update:**
```typescript
describe('AppSpec Chat Flow', () => {
  it('should not fall through to v0 on AppSpec failure', async () => {
    // Mock AppSpec generation to fail
    vi.mocked(createDraftAppSpec).mockRejectedValue(new Error('LLM failed'))

    const response = await POST(createRequest({ message: 'build me an app' }))

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      error: 'appspec_generation_failed',
    })

    // Verify v0.chats.create was NOT called
    expect(v0.chats.create).not.toHaveBeenCalled()
  })

  it('should regenerate AppSpec for follow-up messages', async () => {
    const existingSpec = createMockAppSpec()
    vi.mocked(getAppByChatId).mockResolvedValue({ spec: existingSpec })
    vi.mocked(regenerateAppSpec).mockResolvedValue(updatedSpec)

    const response = await POST(createRequest({
      chatId: 'existing-chat-id',
      message: 'add a field for insurance',
    }))

    expect(regenerateAppSpec).toHaveBeenCalledWith(existingSpec, 'add a field for insurance')
    expect(updateAppSpec).toHaveBeenCalled()
  })

  it('should compile AppSpec before sending to v0', async () => {
    // ... test that compileAppSpecToPrompt is called
  })
})
```

**Acceptance Criteria:**
- [x] Test for no fallback behavior
- [x] Test for AppSpec regeneration
- [x] Test for compiled prompt to v0
- [x] All tests pass

---

### Task 5.2: Manual E2E testing checklist

**Priority:** HIGH

**Test Scenarios:**
1. [x] New chat → AppSpec generation → intent confirmation shown
2. [x] Confirm intent → code generation starts
3. [x] Follow-up message → AppSpec regenerated → compiled prompt sent
4. [x] Progress messages visible during flow
5. [x] AppSpec failure → friendly error (no v0 fallback)
6. [x] Questionnaire content → fallback UI renders

---

## Dependency Graph

```
Phase 1 (Blocking)
├── Task 1.1: Fix home-client.tsx intent handling
└── Task 1.2: Remove dangerous fallback

Phase 2 (Core Flow) - Depends on Phase 1
├── Task 2.2: Add DB helper functions
├── Task 2.3: Import compileAppSpecToPrompt
└── Task 2.1: Implement AppSpec regeneration (depends on 2.2, 2.3)

Phase 3 (UX Enhancement) - Depends on Phase 2
├── Task 3.1: Create progress streaming utility
├── Task 3.2: Integrate in route.ts (depends on 3.1)
└── Task 3.3: Handle in frontend (depends on 3.2)

Phase 4 (Fallback) - Can run parallel to Phase 3
├── Task 4.1: Questionnaire detector
└── Task 4.2: Fallback UI (depends on 4.1)

Phase 5 (Validation) - Final
├── Task 5.1: Update tests
└── Task 5.2: Manual E2E testing
```

---

## Files Summary

| File | Changes |
|------|---------|
| `components/home/home-client.tsx` | Handle intent-confirmation JSON response |
| `app/api/chat/route.ts` | Remove fallback, add regeneration flow, add progress streaming |
| `lib/db/queries.ts` | Add `getAppByChatId`, `updateAppSpec` functions |
| `lib/streaming/progress-stream.ts` | New file for progress streaming utilities |
| `components/message-renderer.tsx` | Add questionnaire fallback UI |
| `hooks/use-chat.ts` | Handle progress message events |
| `app/api/chat/__tests__/route.appspec.test.ts` | Update tests for new flow |

---

*Generated by Clavix Planning Agent. Ready for implementation with `/clavix:implement`.*
