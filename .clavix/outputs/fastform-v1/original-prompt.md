# Original Prompt (Extracted from Conversation)

Build Fastform, a chat-based platform that generates healthcare mini-apps from user intent. When users describe what they need in chat, Fastform uses an LLM to create a structured AppSpec, compiles that spec into a prompt for v0 to generate code, and deploys the resulting application. The first iteration proves the pipeline with "Psych Intake Lite" as an example, but the system should generalize to any healthcare mini-app.

The flow works like this: User types their intent in the existing chat UI, ChatGPT or Claude (preferably via Azure but swappable) generates or updates an AppSpec stored in the database, the AppSpec gets compiled into a prompt, v0 generates the code and provides a preview, and users can iterate by continuing the chat. When satisfied, users deploy to staging first, test it, then promote to production. The AppSpec lives in a JSONB column in the existing apps table and serves as the single source of truth for generation.

For the intent confirmation step, after the LLM creates a draft AppSpec, Fastform shows a rich chat message (not a separate screen) with a preview of features, proposed app name and slug, and action buttons to confirm or continue refining. The draft AppSpec stays in memory until confirmed. Users can refine by naturally continuing the chat, which triggers full AppSpec regeneration. The system uses a template-based initialization where it auto-picks the closest template (Psych Intake Lite in v1) and adjusts it based on chat, without explicitly mentioning "templates" to users.

Auth is always injected as middleware and an auth module with magic link as the default, ensuring consistency and security across all generated apps. The backend is a central multi-tenant architecture where one Fastform backend serves all apps, with behavior driven by the AppSpec and data tenanted by appId. Each app gets its own GitHub repo named with a user ID prefix and app slug, using branch-based environments where staging and main branches deploy to different Vercel environments. When users request features the AppSpec schema can't represent, the system blocks the request and suggests supported capabilities to maintain determinism.

---
*Extracted by Clavix on 2026-01-08. See optimized-prompt.md for enhanced version.*
