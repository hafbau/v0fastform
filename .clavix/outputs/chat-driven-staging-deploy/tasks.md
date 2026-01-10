# Implementation Plan

**Project**: chat-driven-staging-deploy
**Generated**: 2026-01-10T00:00:00Z

## Technical Context & Standards
*Detected Stack & Patterns*
- **Framework**: Next.js (App Router) + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS + shadcn/ui primitives (`components/ui/*`)
- **State**: Local React state + SWR (`useSWR`, `mutate`) + small Context (`contexts/streaming-context.tsx`)
- **Chat UI**: v0 streaming via `/api/chat` → `@v0-sdk/react` `StreamingMessage` (`components/chat/chat-messages.tsx`)
- **Backend**: Next.js Route Handlers under `app/api/*`
- **DB**: Drizzle ORM with SQL migrations (`lib/db/schema.ts`, `lib/db/migrations/*`, `lib/db/queries.ts`)
- **Integrations**: v0 SDK (`v0-sdk`), GitHub API via Octokit (`@octokit/rest`), Vercel REST API via `fetch` (`lib/deploy/vercel-deploy.ts`)
- **Conventions**: Path alias `@/*`, “server-only” modules for server code, keep UI non-technical (no SHAs/branches visible)

---

## Phase 1: Data Model & Status Contracts

- [ ] **Add deployment tracking schema + migration** (ref: mini-prd.md “Persist enough metadata server-side…”, “Publish allowed if any successful staging deploy exists”)
  Task ID: phase-1-data-model-01
  > **Implementation**: Create/Edit `lib/db/schema.ts` and add a new migration in `lib/db/migrations/`.
  > **Details**: Implement a `deployments` table (as described in `lib/deploy/DEPLOYMENTS_SCHEMA.md`) to store environment (`staging|production`), status (`deploying|ready|failed`), `deploymentUrl`, and relevant IDs for querying “latest successful staging” and “deployment in progress”.

- [ ] **Persist per-app Git/Vercel linkage metadata** (ref: mini-prd.md “Vercel project per runtime-created repo”)
  Task ID: phase-1-data-model-02
  > **Implementation**: Edit `lib/db/schema.ts` and add a migration in `lib/db/migrations/`.
  > **Details**: Add columns to `apps` for the minimum durable linkage needed to make runtime-created repos deployable (e.g., GitHub repo owner/name/url; Vercel project id/name). Ensure the design supports the current `createAppRepo` behavior (it can fall back to personal owner today), or explicitly remove that fallback and store only org-owned repos.

- [ ] **Add DB query helpers for deployment status** (ref: mini-prd.md “disable chat input during update cycle”, “Publish gating”)
  Task ID: phase-1-data-model-03
  > **Implementation**: Edit `lib/db/queries.ts`.
  > **Details**: Add file-specific query helpers to: (1) create a deployment record at cycle start, (2) mark it ready/failed with URL + timestamps, (3) fetch “latest successful staging deploy for app”, (4) fetch “latest deployment attempt + status” for UI polling, and (5) check “has any successful staging deploy” (used to enable Publish).

---

## Phase 2: Vercel Project Linking (Runtime Repo → Deployable Project)

- [ ] **Implement “ensure Vercel project exists & is linked to repo”** (ref: mini-prd.md “auto-create/link Vercel project for newly created GitHub repos”)
  Task ID: phase-2-vercel-linking-01
  > **Implementation**: Create `lib/deploy/vercel-project.ts`.
  > **Details**: Add an idempotent helper that, given `{ repoOwner, repoName }`, ensures a Vercel project exists and is connected via Git integration (production branch `main`, preview from `staging`). It should handle “already exists” gracefully, and return `{ projectId, projectName }` for persistence.

- [ ] **Wire Vercel project linking into the deploy pipeline** (ref: mini-prd.md “Vercel linkage must be automated or staging will never update”)
  Task ID: phase-2-vercel-linking-02
  > **Implementation**: Edit `lib/deploy/vercel-deploy.ts`.
  > **Details**: Before polling deployments, ensure the Vercel project is created/linked for the repo (using the new helper). Persist the resulting project metadata on the app (Phase 1 DB fields), so subsequent cycles don’t re-create/link.

---

## Phase 3: Deploy Orchestration Refactor (Deploy “Current Code”, Not “Current AppSpec”)

- [ ] **Add “sync staging from existing v0 chat code” entrypoint** (ref: mini-prd.md “deploy the current code, not the current appspec”)
  Task ID: phase-3-deploy-orchestrator-01
  > **Implementation**: Edit `lib/deploy/vercel-deploy.ts`.
  > **Details**: Introduce a new orchestrator function (separate from `triggerStagingDeploy`) that takes `{ appId, chatId }`, fetches the v0 chat’s `latestVersion.files`, post-processes via `injectInvariants/extractFiles`, commits to GitHub `staging`, ensures Vercel project linkage, and polls Vercel until the deployment for that commit is ready. This function is the source of truth for the “Current preview” URL.

- [ ] **Implement single in-flight protection at the server** (ref: mini-prd.md “reject additional messages while cycle runs”)
  Task ID: phase-3-deploy-orchestrator-02
  > **Implementation**: Edit `lib/deploy/vercel-deploy.ts` and `lib/db/queries.ts`.
  > **Details**: Enforce that only one “preview update cycle” can run per app at a time. Use the `deployments` table (status `deploying`) as the lock source-of-truth (preferred) so it works across processes. Return a clear, non-technical error when a second cycle is attempted.

- [ ] **Deprecate/contain the AppSpec→new v0 chat generation path** (ref: mini-prd.md “Remove deploy-to-staging action”)
  Task ID: phase-3-deploy-orchestrator-03
  > **Implementation**: Edit `lib/deploy/vercel-deploy.ts` and `app/api/apps/[appId]/deploy/staging/route.ts`.
  > **Details**: Stop using “Deploy to staging” as “compile AppSpec → create a new v0 chat → deploy”. Either: (a) keep `triggerStagingDeploy` for manual/admin fallback only, or (b) refactor it to call the new “sync from chat” entrypoint. Update route comments/tests to match the new behavior.

---

## Phase 4: API Endpoints for Preview Sync + Status

- [ ] **Create an internal “preview sync” endpoint** (ref: mini-prd.md “no deploy button; automatic after chat”)
  Task ID: phase-4-api-01
  > **Implementation**: Create `app/api/apps/[appId]/preview/sync/route.ts`.
  > **Details**: Auth + app ownership check; accept `{ chatId }` in body; call the new “sync staging from chat” function; return `{ status, previewUrl, message }` with user-safe messaging (no SHAs/branches). If another cycle is running, return a “please wait” style error (HTTP 409).

- [ ] **Implement real staging status endpoint backed by DB** (ref: mini-prd.md “status in preview header + near input; keep last working preview on failure”)
  Task ID: phase-4-api-02
  > **Implementation**: Edit `app/api/apps/[appId]/deploy/staging/route.ts` (GET).
  > **Details**: Replace placeholder status with DB-backed status: latest deployment attempt status; latest successful `stagingUrl` (if any); user-safe status message. This powers polling on page load and after refresh.

- [ ] **Update production promotion gating to match v1 rule** (ref: mini-prd.md “Publish allowed if any successful staging deploy exists”)
  Task ID: phase-4-api-03
  > **Implementation**: Edit `app/api/apps/[appId]/deploy/production/route.ts`.
  > **Details**: Before promotion, check DB for “any successful staging deployment exists” and return a friendly 400 if none. Keep promotion semantics (merge staging→main) but ensure UI can safely enable Publish based on DB state.

---

## Phase 5: Frontend UX (Non-Technical “Current Preview” + Inline Status)

- [ ] **Remove “Deploy to staging” UI and replace with automatic preview updates** (ref: mini-prd.md “Remove Deploy to staging”, “inline status only”)
  Task ID: phase-5-ui-01
  > **Implementation**: Edit `components/chats/chat-detail-client.tsx`.
  > **Details**: Remove the staging deploy button + related state. Replace with: (1) a “Current preview” link area, (2) an inline status indicator in the preview area, and (3) error messaging that is non-technical. Preserve production “Publish” CTA (renaming from “Promote to Production” if desired) and ensure it’s enabled when a successful staging deploy exists.

- [ ] **Add “preview updating” state to chat send flow and disable input during full cycle** (ref: mini-prd.md “single in-flight cycle; disable input; no queueing”)
  Task ID: phase-5-ui-02
  > **Implementation**: Edit `hooks/use-chat.ts` and the caller components (`components/chats/chat-detail-client.tsx`, `components/home/home-client.tsx`).
  > **Details**: After the v0 streaming response completes, automatically call the new preview sync endpoint. Keep the chat input disabled until that sync call returns success/failure. Ensure the UI shows small inline status near the input while the preview is updating.

- [ ] **Update preview panel to display the staging “Current preview” URL** (ref: mini-prd.md “Current preview updates via staging deploy”)
  Task ID: phase-5-ui-03
  > **Implementation**: Edit `components/chat/preview-panel.tsx`.
  > **Details**: Replace `currentChat.demo` as the primary preview source with the staging preview URL returned by status/sync APIs. Keep a safe fallback behavior if no staging preview exists yet. Add a short status line in the preview header (“Updating preview…”, “Preview ready”, “Couldn’t update preview…”) without exposing technical identifiers.

- [ ] **Ensure page-load hydration of preview link + status** (ref: mini-prd.md “keep preview usable; show status in both places”)
  Task ID: phase-5-ui-04
  > **Implementation**: Edit `components/chats/chat-detail-client.tsx` (and/or a shared hook) to poll `GET /api/apps/[appId]/deploy/staging`.
  > **Details**: On mount/refresh, fetch the latest staging status and populate the preview URL + status. Do not require the user to click anything to restore the preview link.

---

## Phase 6: Tests & Guardrails

- [ ] **Add route tests for preview sync + status** (ref: mini-prd.md success criteria)
  Task ID: phase-6-tests-01
  > **Implementation**: Create `app/api/apps/[appId]/preview/sync/route.test.ts` and update `app/api/apps/[appId]/deploy/staging/route.test.ts`.
  > **Details**: Mock v0 SDK and GitHub/Vercel integration boundaries; verify auth/ownership; verify 409 on in-flight; verify “last working preview preserved” behavior when sync fails.

- [ ] **Add unit tests for new DB queries** (ref: mini-prd.md “publish gating”, “status correctness”)
  Task ID: phase-6-tests-02
  > **Implementation**: Create/Edit tests near existing DB test patterns (e.g., `lib/db/schema.test.ts` or a new `lib/db/deployments.test.ts`).
  > **Details**: Validate “latest successful staging deploy” selection, “in-flight” detection, and “has any successful staging deploy” predicate.

---

*Generated by Clavix /clavix-plan*

