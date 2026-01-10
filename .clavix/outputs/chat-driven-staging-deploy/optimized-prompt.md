# Optimized Prompt (Clavix Enhanced)

Build a chat-driven “continuous preview” workflow for a non-technical audience where the user never clicks “Generate code” or “Deploy to staging.” Each user chat message triggers a single update cycle: (1) update/create the app’s AppSpec, (2) compile AppSpec → prompt, (3) call v0 to generate code using `responseMode: 'sync'`, (4) commit the generated output to a GitHub repo on the `staging` branch, and (5) rely on Vercel Git integration to automatically deploy that branch and update a stable “Current preview” URL.

Remove “Deploy to staging” as a user action. Treat staging deployment as an internal side-effect of committing to `staging`. Ensure the runtime-created GitHub repos are automatically connected to Vercel by creating/linking a Vercel Project per app repo (Option A). Assume the Vercel GitHub integration has access to all repos in the target org, including private repos.

UI/UX (non-technical):
- Never show git SHAs, branches, or code-centric identifiers.
- While an update cycle is running, disable chat input and reject additional messages (no queueing, no cancel/replace).
- Do not use a global loading overlay. Show short inline statuses in two places: near the chat input and in the preview panel header.
- Keep the preview link usable during updates. If an update fails, show a friendly error and keep serving the last working preview (the preview link should still work).

Publish flow:
- “Publish” promotes staging to production by merging `staging` → `main`.
- Publish is allowed as long as at least one successful staging deploy exists (it can publish the last working staged version even if the most recent update failed).
- After publishing, continued chat messages still run the same staging update cycle; publishing again promotes the latest staged changes.

Error handling (v1):
- Keep v0 generation synchronous (`responseMode: 'sync'`).
- If v0 generation fails (including socket/fetch failures), surface a user-friendly message, unlock chat immediately, and preserve access to the current preview (last successful deploy).

Deliverables:
- Backend orchestration updates to support the above flow and maintain minimal server-side state for “update running/idle”, “preview updating/ready/failed”, and publish eligibility.
- Frontend state updates to disable chat input during update cycles and to display inline preview statuses (no technical identifiers).

---

## Optimization Improvements Applied

1. **[Structure]** Reframed the system as an explicit “update cycle” with ordered phases and clear boundaries.
2. **[Clarity]** Replaced ambiguous “deploy” terminology with “Current preview” and “Publish” semantics appropriate for non-technical users.
3. **[Completeness]** Added explicit UI/state rules: single in-flight cycle, disable input, dual inline status placement, preserve preview on failures.
4. **[Actionability]** Converted decisions into implementable constraints (remove staging deploy button; Vercel project per repo; publish gating rule).
5. **[Efficiency]** Removed incidental implementation details not needed for v1 (e.g., async v0 polling, retries) while keeping the sync failure behavior.

---
*Optimized by Clavix on 2026-01-09. This version is ready for implementation.*

