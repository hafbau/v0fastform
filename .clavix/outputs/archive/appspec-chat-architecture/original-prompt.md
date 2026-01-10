# Original Prompt (Extracted from Conversation)

Fix the chat architecture in Fastform so that the AppSpec flow is the only path for user messages. Currently there are multiple issues: home-client.tsx doesn't handle intent-confirmation responses and treats JSON as a stream, there's a dangerous fallback in route.ts that sends messages directly to v0 if AppSpec generation fails, and the chat API doesn't include AppSpec context when sending messages to v0 after the spec is confirmed.

The flow should be: user types a message, existing AppSpec is fetched from the database, the AppSpec is regenerated using the existing spec plus the new user message, the updated AppSpec is persisted back to the database, then the AppSpec is compiled into a detailed prompt and sent to v0 for code generation. Progress messages should be streamed to the user throughout this process without mentioning internal systems like v0 or AppSpec.

Technical constraints include using the existing compileAppSpecToPrompt function in lib/compiler/appspec-to-prompt.ts, persisting to PostgreSQL via the apps.spec column, and augmenting the existing streaming infrastructure with progress messages. The v0 SDK is used for code generation but should never be mentioned to users.

Success means no user message ever bypasses AppSpec transformation, users see clear progress indicators, code generation receives enough context that it doesn't ask unnecessary questions, and there's a simple fallback UI if questionnaire content is somehow returned.

---
*Extracted by Clavix on 2026-01-09. See optimized-prompt.md for enhanced version.*
