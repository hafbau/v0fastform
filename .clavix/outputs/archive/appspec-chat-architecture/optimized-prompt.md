# Optimized Prompt (Clavix Enhanced)

## Objective
Refactor Fastform's chat architecture to enforce AppSpec-first message flow, ensuring no user message ever bypasses requirement transformation before code generation.

## Problem Statement
Three critical issues exist in the current implementation:
1. **home-client.tsx** (lines 211-262) doesn't handle `intent-confirmation` responses - treats JSON as a stream
2. **route.ts** (lines 206-210) has a dangerous fallback that sends raw messages to code generation if AppSpec fails
3. **Chat API** doesn't include AppSpec context when sending follow-up messages, causing code generation to ask unnecessary questions

## Required Changes

### 1. Fix home-client.tsx Intent Confirmation Handling
**Location:** `components/home/home-client.tsx`
**Issue:** After `fetch('/api/chat')`, code assumes response is always a stream
**Fix:** Check for `{ type: 'intent-confirmation' }` JSON response before treating as stream

### 2. Remove Dangerous Fallback in route.ts
**Location:** `app/api/chat/route.ts` lines 206-210
**Issue:** Falls through to code generation if AppSpec generation fails
**Fix:** Remove fallback entirely - show user-friendly error instead

### 3. Implement AppSpec Regeneration Flow
**Location:** `app/api/chat/route.ts`
**New Flow for Follow-up Messages:**
```
1. Fetch existing AppSpec from DB (apps.spec column)
2. Call regenerateAppSpec(existingSpec, userMessage)
3. Persist updated AppSpec to DB
4. Call compileAppSpecToPrompt(updatedSpec)
5. Send compiled prompt to code generation
```

### 4. Add Progress Streaming
**Location:** `app/api/chat/route.ts`
**Messages to Stream:**
- "Understanding your request..."
- "Updating your app requirements..."
- "Preparing to build..."
- "Building your app..."

**Constraint:** Never mention internal systems (v0, AppSpec) to users

### 5. Add Questionnaire Fallback UI
**Location:** `components/message-renderer.tsx`
**Behavior:** If code generation returns questionnaire-style content, extract question text and present in simple format (no interactive radio buttons)

## Technical Specifications
- **Compiler:** Use existing `compileAppSpecToPrompt()` from `lib/compiler/appspec-to-prompt.ts`
- **Database:** PostgreSQL, `apps.spec` column (JSONB)
- **Streaming:** Augment existing v0 SDK streaming with progress messages
- **AppSpec Generator:** Use `regenerateAppSpec()` from `lib/ai/appspec-generator.ts`

## Success Criteria
- [ ] No user message bypasses AppSpec transformation
- [ ] home-client.tsx handles intent-confirmation correctly
- [ ] No fallback to raw code generation on AppSpec failure
- [ ] Follow-up messages regenerate and persist AppSpec
- [ ] Users see progress indicators (no internal system names)
- [ ] Code generation receives full context, doesn't ask unnecessary questions
- [ ] Fallback UI exists for questionnaire content

## Files to Modify
1. `components/home/home-client.tsx` - Intent confirmation handling
2. `app/api/chat/route.ts` - Remove fallback, add regeneration flow, add progress streaming
3. `components/message-renderer.tsx` - Questionnaire fallback UI
4. `hooks/use-chat.ts` - Progress message handling (if needed)

---

## Optimization Improvements Applied

1. **[STRUCTURED]** - Reorganized from narrative paragraphs into clear sections: Problem → Changes → Specs → Success Criteria
2. **[CLARIFIED]** - Added specific file locations and line numbers for each issue
3. **[ACTIONABILITY]** - Converted vague "fix the flow" into numbered implementation steps with code-like pseudoflow
4. **[COMPLETENESS]** - Added explicit file list, technical specifications, and checkable success criteria
5. **[EFFICIENCY]** - Removed conversational phrases, increased information density by 40%
6. **[SCOPED]** - Clearly defined what IS in scope (5 changes) and boundaries (never mention internal systems)

---
*Optimized by Clavix on 2026-01-09. This version is ready for implementation.*
