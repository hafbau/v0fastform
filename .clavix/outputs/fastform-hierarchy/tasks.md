# Implementation Plan

**Project**: fastform-hierarchy
**Generated**: 2026-01-06T23:45:00Z

## Technical Context & Standards

*Detected Stack & Patterns*
- **Framework**: Next.js 16 (App Router, Turbopack)
- **ORM**: Drizzle ORM with PostgreSQL
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **API**: v0 SDK for chat data, local DB for ownership tracking
- **Conventions**: camelCase columns, TypeScript, `lib/db/` for DB layer

---

## Phase 1: Database Schema Updates

- [x] **Rename columns to camelCase in schema.ts** (ref: Core Requirements)
  Task ID: phase-1-schema-01
  > **Implementation**: Edit `lib/db/schema.ts`.
  > **Details**:
  > - `users` table: rename `created_at` column to `createdAt`
  > - `chat_ownerships` table: rename `v0_chat_id` → `v0ChatId`, `user_id` → `userId`, `created_at` → `createdAt`
  > - `anonymous_chat_logs` table: rename `ip_address` → `ipAddress`, `v0_chat_id` → `v0ChatId`, `created_at` → `createdAt`
  > - Keep the DB column names as-is in the string argument (e.g., `varchar('v0ChatId')`), Drizzle will handle mapping

- [ ] **Add apps table to schema.ts** (ref: Core Requirements)
  Task ID: phase-1-schema-02
  > **Implementation**: Edit `lib/db/schema.ts`.
  > **Details**:
  > - Create `apps` table with columns: `id` (uuid, PK), `userId` (uuid, FK → users.id), `name` (varchar 255), `createdAt` (timestamp)
  > - Export `App` type using `InferSelectModel<typeof apps>`
  > - Add foreign key reference to users table

- [ ] **Add appId foreign key to chatOwnerships** (ref: Core Requirements)
  Task ID: phase-1-schema-03
  > **Implementation**: Edit `lib/db/schema.ts`.
  > **Details**:
  > - Add `appId` column (uuid, FK → apps.id) to `chat_ownerships` table
  > - This links each chat to an app
  > - Make it NOT NULL (all chats must belong to an app)

---

## Phase 2: Database Migration

- [ ] **Generate Drizzle migration** (ref: Technical Constraints)
  Task ID: phase-2-migration-01
  > **Implementation**: Run `pnpm db:generate` then `pnpm db:migrate`.
  > **Details**:
  > - This will generate SQL migration files in `drizzle/` folder
  > - Review the generated migration before running
  > - The migration will rename columns and add new table
  > - **WARNING**: Existing data needs the appId column — see Phase 6 for data migration

---

## Phase 3: Query Layer Updates

- [x] **Update queries.ts for camelCase columns** (ref: Technical Constraints)
  Task ID: phase-3-queries-01
  > **Implementation**: Edit `lib/db/queries.ts`.
  > **Details**:
  > - Update all references from `chat_ownerships.v0_chat_id` → `chat_ownerships.v0ChatId`
  > - Update `chat_ownerships.user_id` → `chat_ownerships.userId`
  > - Update `chat_ownerships.created_at` → `chat_ownerships.createdAt`
  > - Update `anonymous_chat_logs.ip_address` → `anonymous_chat_logs.ipAddress`
  > - Update `anonymous_chat_logs.v0_chat_id` → `anonymous_chat_logs.v0ChatId`
  > - Update `anonymous_chat_logs.created_at` → `anonymous_chat_logs.createdAt`
  > - Update `users.created_at` → `users.createdAt` (if used)

- [ ] **Add app CRUD query functions** (ref: Core Requirements)
  Task ID: phase-3-queries-02
  > **Implementation**: Edit `lib/db/queries.ts`.
  > **Details**:
  > - Add `createApp({ userId, name })` — insert into apps table
  > - Add `getAppsByUserId({ userId })` — select apps where userId matches, order by createdAt desc
  > - Add `getAppById({ appId })` — select single app by id
  > - Add `deleteApp({ appId })` — delete app (chats cascade via DB constraint or manual delete)
  > - Follow existing patterns in the file (try/catch, getDb(), console.error)

- [ ] **Update createChatOwnership to require appId** (ref: Core Requirements)
  Task ID: phase-3-queries-03
  > **Implementation**: Edit `lib/db/queries.ts`.
  > **Details**:
  > - Update `createChatOwnership` signature to require `appId` parameter
  > - Insert appId into the chat_ownerships record
  > - Update type signature: `{ v0ChatId, userId, appId }`

- [ ] **Add getChatsByAppId query function** (ref: Core Requirements)
  Task ID: phase-3-queries-04
  > **Implementation**: Edit `lib/db/queries.ts`.
  > **Details**:
  > - Add `getChatIdsByAppId({ appId })` — get all v0ChatIds for an app
  > - Similar to existing `getChatIdsByUserId` but filters by appId instead

- [ ] **Add deleteChatsByAppId for cascade delete** (ref: Core Requirements)
  Task ID: phase-3-queries-05
  > **Implementation**: Edit `lib/db/queries.ts`.
  > **Details**:
  > - Add `deleteChatOwnershipsByAppId({ appId })` — delete all chat ownerships for an app
  > - This enables cascade delete when an app is deleted

---

## Phase 4: API Routes

- [ ] **Create /api/apps route (list & create)** (ref: Core Requirements)
  Task ID: phase-4-api-01
  > **Implementation**: Create `app/api/apps/route.ts`.
  > **Details**:
  > - `GET`: Return list of apps for authenticated user (use `getAppsByUserId`)
  > - `POST`: Create new app with `{ name }` body (use `createApp`)
  > - Follow auth pattern from existing routes (check session, get userId)
  > - Return JSON with apps array or created app

- [ ] **Create /api/apps/[appId] route (get & delete)** (ref: Core Requirements)
  Task ID: phase-4-api-02
  > **Implementation**: Create `app/api/apps/[appId]/route.ts`.
  > **Details**:
  > - `GET`: Return single app by ID (validate user owns it)
  > - `DELETE`: Delete app and cascade delete all its chats
  >   - First delete all chat ownerships via `deleteChatOwnershipsByAppId`
  >   - Then delete the app via `deleteApp`
  > - Return 404 if app not found, 403 if user doesn't own it

- [ ] **Update chat creation to require appId** (ref: Core Requirements)
  Task ID: phase-4-api-03
  > **Implementation**: Edit `app/api/chat/route.ts`.
  > **Details**:
  > - Require `appId` in request body for new chat creation
  > - Pass `appId` to `createChatOwnership` call
  > - Return 400 if appId is missing
  > - Validate user owns the app before creating chat in it

- [ ] **Update chat ownership route for appId** (ref: Core Requirements)
  Task ID: phase-4-api-04
  > **Implementation**: Edit `app/api/chat/ownership/route.ts`.
  > **Details**:
  > - Update to accept and store appId when creating ownership
  > - Follow same pattern as main chat route

---

## Phase 5: UI Components

- [ ] **Update HomeClient to show apps list** (ref: UI Flow)
  Task ID: phase-5-ui-01
  > **Implementation**: Edit `components/home/home-client.tsx`.
  > **Details**:
  > - Fetch user's apps from `/api/apps` on mount
  > - Display list of apps (name, created date)
  > - Add "Create New App" button/form
  > - Each app links to `/apps/[appId]/chats`
  > - Remove direct chat creation from home (must select app first)

- [ ] **Update ChatsClient to use appId** (ref: UI Flow)
  Task ID: phase-5-ui-02
  > **Implementation**: Edit `components/chats/chats-client.tsx`.
  > **Details**:
  > - Accept `appId` prop from page
  > - Fetch chats for specific app (update API call to filter by appId)
  > - Display app name in header
  > - "New Chat" button should pass appId to chat creation

- [ ] **Update ChatDetailClient to validate appId** (ref: UI Flow)
  Task ID: phase-5-ui-03
  > **Implementation**: Edit `components/chats/chat-detail-client.tsx`.
  > **Details**:
  > - Accept `appId` prop from page
  > - Validate chat belongs to app (or let API handle this)
  > - Update breadcrumb/navigation to show: Apps > [App Name] > Chat

- [ ] **Wire up [appId] route parameter in pages** (ref: UI Flow)
  Task ID: phase-5-ui-04
  > **Implementation**: Edit `app/(app)/apps/[appId]/chats/page.tsx` and `app/(app)/apps/[appId]/chats/[chatId]/page.tsx`.
  > **Details**:
  > - Extract `appId` from `params` in both pages
  > - Pass `appId` to ChatsClient and ChatDetailClient components
  > - Currently these pages exist but don't use the appId param

- [ ] **Update apps list page** (ref: UI Flow)
  Task ID: phase-5-ui-05
  > **Implementation**: Edit `app/(app)/apps/page.tsx`.
  > **Details**:
  > - This is the home page after login
  > - Render HomeClient which shows apps list
  > - Ensure navigation from here goes to `/apps/[appId]/chats`

---

## Phase 6: Data Migration

- [ ] **Create migration script for existing chats** (ref: Edge Cases)
  Task ID: phase-6-data-01
  > **Implementation**: Create `lib/db/migrations/migrate-chats-to-default-app.ts`.
  > **Details**:
  > - For each user with existing chats but no apps:
  >   - Create a default app named "My App" (or "Default App")
  >   - Assign all their existing chat_ownerships to this app
  > - Run this AFTER schema migration but BEFORE making appId NOT NULL
  > - Alternative: Make appId nullable initially, run migration, then alter to NOT NULL

- [ ] **Run data migration** (ref: Edge Cases)
  Task ID: phase-6-data-02
  > **Implementation**: Run `pnpm tsx lib/db/migrations/migrate-chats-to-default-app.ts`.
  > **Details**:
  > - Execute the migration script
  > - Verify all chat_ownerships now have an appId
  > - Can then alter column to NOT NULL if it was nullable

---

## Phase 7: Verification

- [ ] **Test app CRUD operations** (ref: Success Criteria)
  Task ID: phase-7-verify-01
  > **Implementation**: Manual testing or write tests.
  > **Details**:
  > - Create an app → verify it appears in list
  > - Delete an app → verify its chats are also deleted
  > - Verify can't create chat without selecting app

- [ ] **Test UI flow** (ref: Success Criteria)
  Task ID: phase-7-verify-02
  > **Implementation**: Manual testing.
  > **Details**:
  > - Login → see apps list
  > - Click app → see chats for that app only
  > - Create new chat → verify it's in correct app
  > - Navigate via breadcrumbs

- [ ] **Verify camelCase consistency** (ref: Success Criteria)
  Task ID: phase-7-verify-03
  > **Implementation**: Code review.
  > **Details**:
  > - Grep for snake_case patterns in lib/db/
  > - Ensure no references to old column names remain
  > - Verify TypeScript types reflect new column names

---

*Generated by Clavix /clavix:plan*
