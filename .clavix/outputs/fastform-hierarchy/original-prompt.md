# Original Prompt (Extracted from Conversation)

Refactor the fastform codebase to implement a simplified information hierarchy. The primary entity is an "app" (called "project" in v0's API, but we use "app" for non-tech-savvy users). An app has zero or more chats, and all chats must belong to an app. Apps belong directly to users — no organizations needed for now.

The key requirements are: create a new `apps` database table, update the `chat_ownerships` table to reference apps, and enforce that users must select or create an app before starting a chat. When an app is deleted, all its chats should be cascade deleted. Chats cannot be moved between apps once created.

All database column names must use camelCase (not snake_case). This applies to new tables and requires migrating existing tables: `users`, `chat_ownerships`, and `anonymous_chat_logs` need their columns renamed from snake_case to camelCase.

The codebase should use "app" terminology everywhere — in code, database, API routes, and UI. The only exception is when interfacing with v0's platform API, where "project" terminology is used. The goal is to make the codebase super simple to reason about for both humans and AI bots.

---
*Extracted by Clavix on 2026-01-06. See optimized-prompt.md for enhanced version.*
