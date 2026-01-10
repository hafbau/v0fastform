# Original Prompt (Extracted from Conversation)

We need to fix confusion and architecture around “deploy to staging.” Deploy should not recompile the current AppSpec and generate new code; instead, staging should always reflect deployed code. For v1, the user should never click “Generate code” or “Deploy to staging”; they just chat. Each chat message updates the AppSpec, compiles it to a prompt, sends it to v0 for code generation (sync), commits the generated code to the app’s GitHub repo on the `staging` branch, and Vercel should auto-deploy that staging branch. The user repeats this cycle until they are happy.

When the user clicks “Publish”, we deploy to production by merging `staging` to `main` (production). After publishing, the user can continue chatting and we keep updating staging the same way; publishing again promotes the latest staged changes to production.

UI requirements: the audience is non-technical, so never show commit SHAs or other code-related identifiers. While a generation/deploy cycle is running, the chat input should be disabled (reject new messages) but there should be no global loading overlay; show simple inline status both near the chat input and near the preview panel. If v0 generation fails (e.g., socket fetch failure), show a friendly error and unlock chat immediately; keep the preview link usable and pointing to the last working deployed preview.

---
*Extracted by Clavix on 2026-01-09. See optimized-prompt.md for enhanced version.*

