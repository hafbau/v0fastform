# Optimized Prompt (Clavix Enhanced)

## Objective

Refactor fastform to a clean **User → Apps → Chats** hierarchy. Make the codebase simple to reason about for humans and AI agents.

## Information Architecture

```
User (1)
 └── Apps (many)      ← NEW entity
      └── Chats (many)
```

**Rules:**
- Apps belong to users (no orgs)
- All chats must belong to an app (no orphans)
- User must select/create app before chatting
- Deleting app cascades to its chats
- Chats are immutable to their app (no moving)

## Database Changes

### 1. New `apps` table
```
apps:
  - id (UUID, PK)
  - userId (UUID, FK → users.id)
  - name (VARCHAR)
  - createdAt (TIMESTAMP)
```

### 2. Update `chatOwnerships` table
- Add `appId` (UUID, FK → apps.id)
- Rename columns: `user_id` → `userId`, `v0_chat_id` → `v0ChatId`, `created_at` → `createdAt`

### 3. Migrate existing tables to camelCase
| Table | Column Changes |
|-------|----------------|
| `users` | `created_at` → `createdAt` |
| `chat_ownerships` | `user_id` → `userId`, `v0_chat_id` → `v0ChatId`, `created_at` → `createdAt` |
| `anonymous_chat_logs` | `ip_address` → `ipAddress`, `v0_chat_id` → `v0ChatId`, `created_at` → `createdAt` |

## API Changes

### New Routes
- `GET /api/apps` — list user's apps
- `POST /api/apps` — create new app
- `GET /api/apps/[appId]` — get app details
- `DELETE /api/apps/[appId]` — delete app (cascade chats)

### Updated Routes
- Chat creation must require `appId`
- Chat routes should validate app ownership

## UI Changes

- Home page: show list of user's apps (not direct chat creation)
- App detail page: show chats for that app
- Wire up the currently-unused `[appId]` route parameter

## Terminology

- Use **"app"** everywhere: code, DB, API, UI
- Use **"project"** only at v0 API boundary layer

## Success Criteria

- [ ] `apps` table exists with proper schema
- [ ] All columns are camelCase across all tables
- [ ] Chat creation requires app selection
- [ ] App deletion cascades to chats
- [ ] UI flow: apps list → app detail → chats
- [ ] `[appId]` route param is validated and used
- [ ] "app" terminology consistent throughout

---

## Optimization Improvements Applied

1. **[STRUCTURED]** - Reorganized into clear sections: Architecture → Database → API → UI → Success Criteria
2. **[CLARIFIED]** - Added explicit entity diagram showing the hierarchy visually
3. **[COMPLETENESS]** - Added specific table schemas with column types
4. **[ACTIONABILITY]** - Converted requirements into checklist-style success criteria
5. **[EFFICIENCY]** - Consolidated scattered requirements into tabular format for quick scanning

---
*Optimized by Clavix on 2026-01-06. This version is ready for implementation.*
