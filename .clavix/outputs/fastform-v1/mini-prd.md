# Requirements: Fastform v1

*Generated from conversation on 2026-01-08*

## Objective
Build Fastform, a chat-based platform that generates healthcare mini-apps from natural language intent. Users describe what they need in chat, Fastform generates a structured AppSpec, compiles it to a prompt, uses v0 to generate code, and deploys the working application to Vercel. The first iteration proves the pipeline with "Psych Intake Lite" as the vertical slice example.

## Core Requirements

### Must Have (High Priority)
- [HIGH] **Chat-to-AppSpec Pipeline**: User types intent → LLM (ChatGPT/Claude) generates/updates AppSpec → Stored in DB
- [HIGH] **AppSpec-Driven Generation**: AppSpec → Prompt Compiler → v0 code generation (deterministic, AppSpec is single source of truth)
- [HIGH] **Intent Confirmation Flow**: After LLM creates draft AppSpec, show rich chat message with features preview, proposed name/slug, and action buttons (Confirm/Refine)
- [HIGH] **Iterative Refinement**: User continues chatting to refine → AppSpec regenerated (full, not patched) → v0 regenerates preview
- [HIGH] **Template-Based Initialization**: Auto-pick closest template (Psych Intake Lite in v1), adjust from chat without mentioning "template" to user
- [HIGH] **Injected Auth Module**: Auth always injected (middleware + auth module), magic link default for all roles unless overridden
- [HIGH] **v0 Preview Integration**: Show v0's preview URL during iteration for visual feedback
- [HIGH] **Staging-First Deploy**: User clicks "Deploy to Staging" → Post-process (inject invariants) → GitHub → Vercel staging environment
- [HIGH] **Production Promotion**: User clicks "Promote to Production" → Merge staging → main → Vercel production deployment
- [HIGH] **Central Multi-Tenant Backend**: One Fastform backend, AppSpec-driven behavior, data tenanted by appId
- [HIGH] **GitHub as Registry**: Each app gets repo `{userId-prefix}-{appSlug}`, branch-based environments (staging/main)
- [HIGH] **Unsupported Features Blocked**: When user requests something AppSpec can't represent, block and suggest supported capabilities (v1)
- [HIGH] **App Name/Slug Generation**: Heuristic first (instant), LLM refines during AppSpec creation
- [HIGH] **Draft AppSpec in Memory**: LLM-first intent confirmation, draft stays in memory until user confirms (not persisted early)
- [HIGH] **Natural Chat Refinement**: If draft doesn't match intent, user describes more naturally in chat (no separate wizard/modal)
- [HIGH] **Azure-First with Fallback**: ChatGPT via Azure preferred (compliance), but swappable to direct OpenAI/Anthropic API

### Should Have (Medium Priority)
- [MEDIUM] **AppSpec Schema Versioning**: Support for evolving AppSpec schema over time (future iterations)

### Could Have (Low Priority / Inferred)
- [LOW] **Multiple Template Support**: Currently auto-picks Psych Intake Lite; mechanism scales to more templates later

## Technical Constraints
- **Existing Tech Stack**: Next.js 16.1.1, React 19.2.3, TypeScript, TailwindCSS 4, Drizzle ORM, PostgreSQL, NextAuth
- **LLM for Intent → AppSpec**: ChatGPT/Claude (Azure preferred, swappable)
- **Code Generation**: v0 SDK (existing integration)
- **Database Schema**: Add `spec` JSONB column to existing `apps` table
- **Deployment**: Vercel (existing)
- **Version Control**: GitHub repos per app, branch-based environments
- **Backend Architecture**: Single multi-tenant backend, behavior driven by AppSpec
- **Auth Strategy**: Always injected middleware/auth module, magic link default
- **Generation Determinism**: Prompt compiled from AppSpec-only (no chat appended)

## User Context
**Target Users:** Healthcare practitioners who need custom mini-apps (intake forms, patient portals, staff workflows)

**Primary Use Case:** User describes their need in chat (e.g., "I need a patient intake form for my psych practice"), Fastform generates the app spec, shows preview, user iterates until satisfied, deploys to staging, tests, then promotes to production

**User Flow:**
1. User types intent in existing chat UI
2. LLM auto-picks closest template + creates draft AppSpec (in memory)
3. Fastform shows intent confirmation as rich chat message (features, name, slug, buttons)
4. User confirms OR continues chatting to refine
5. On confirm: AppSpec persisted to DB `apps.spec` column
6. AppSpec → Prompt Compiler → v0 → Preview shown
7. User iterates (chat → regenerate AppSpec → recompile → v0)
8. User clicks "Deploy to Staging" → Post-process → GitHub staging branch → Vercel
9. User tests staging environment
10. User clicks "Promote to Production" → Merge to main → Vercel production

## Edge Cases & Considerations
- **Unsupported Feature Requests**: User asks for something AppSpec schema can't represent → Block and offer supported alternatives (strict in v1, learn for v2)
- **Multi-Topic Conversations**: If chat covers 3+ distinct app ideas, suggest focusing on one or creating separate sessions
- **AppSpec Regeneration Strategy**: Full regeneration (not patching) for simplicity and consistency in v1
- **Draft Abandonment**: Draft AppSpec in memory means user can lose it if they leave/reload before confirming (acceptable for v1)
- **Backend Data Isolation**: All mini-app data stored with `appId` as tenant key, backend validates against AppSpec
- **GitHub Repo Management**: Need GitHub App/PAT with repo creation permissions under `getfastform` org
- **Vercel Integration**: Need automated deployment from GitHub repos (Vercel GitHub App)

## Implicit Requirements
*Inferred from conversation context - please verify:*
- **[Architecture]** Post-processing step injects invariant files (fastformClient, analytics, auth, middleware) before deployment
- **[Architecture]** Prompt compiler transforms AppSpec JSON into natural language prompt optimized for v0
- **[Data Model]** Submissions, workflow state, staff actions stored in central Fastform backend (not per-app)
- **[Security]** All mini-apps share central auth infrastructure for consistency and compliance
- **[DevOps]** Each deploy creates new commit in GitHub (version history for rollback)
> **Note:** These requirements were surfaced by analyzing the 1-slice-spec.md and conversation patterns.

## Success Criteria
How we know this is complete and working:
- ✓ User can chat "I need a psych intake form" and see draft AppSpec summary within 5 seconds
- ✓ User can iterate on requirements through natural chat, AppSpec updates correctly
- ✓ v0 preview updates after each iteration, shows visual feedback
- ✓ User can deploy to staging with one click, app appears at staging URL within 2 minutes
- ✓ Staging app has working auth (magic link), backend connected, data persists
- ✓ User can promote to production, production URL goes live within 1 minute
- ✓ Generated apps match AppSpec exactly (deterministic compilation)
- ✓ AppSpec stored in DB is valid JSON, readable, and can be recompiled to same prompt
- ✓ Central backend correctly validates submissions against AppSpec fields/workflow

## Architecture Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Intent → AppSpec** | ChatGPT/Claude (Azure preferred) | Better at structured JSON generation than v0 |
| **Code Generation** | v0 SDK | Already integrated, optimized for UI code |
| **AppSpec Storage** | `apps.spec` JSONB column | AppSpec is property of an app, not separate entity |
| **Template Strategy** | Hybrid auto-pick | Scales to multiple templates, hide complexity from user |
| **Generation Source** | AppSpec-only | Deterministic, auditable, reproducible |
| **Auth Approach** | Always injected | Consistent, secure, patchable across all apps |
| **Deploy Strategy** | Staging-first | Safer, allows testing before production |
| **Backend Model** | Central multi-tenant | Standard SaaS pattern, simpler than per-app backends |
| **Registry** | GitHub repos | Version history, rollback, familiar CI/CD |
| **Repo Structure** | Branch-based (staging/main) | Simpler than separate repos per environment |

## Next Steps
1. Review this PRD for accuracy and completeness
2. If anything is missing or unclear, continue the conversation
3. When ready, use `/clavix:plan` to generate implementation tasks
4. Consider `/clavix:improve` on the optimized prompt for further refinement

---
*This PRD was generated by Clavix from conversational requirements gathering.*
