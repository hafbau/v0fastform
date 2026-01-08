# Deploy Module

Post-processing and deployment utilities for v0-generated Fastform apps.

## Overview

This module handles the deployment pipeline for generated Fastform applications:

1. **Post-Processing**: Inject invariant files into v0-generated code
2. **GitHub Integration**: Create and manage GitHub repositories
3. **Template Variables**: Replace app-specific placeholders

## Components

### Post-Processor (`post-processor.ts`)

Injects invariant files into v0-generated code to ensure every app has the required infrastructure.

#### Key Features

- Injects API client, analytics, and authentication middleware
- Replaces template variables with app-specific values
- Configures route protection based on AppSpec roles
- Validates injected files

#### Usage

```typescript
import { injectInvariants, extractFiles } from './post-processor'
import type { FastformAppSpec } from '../types/appspec'

// Inject invariants
const result = await injectInvariants(v0GeneratedCode, appSpec)

// Extract individual files
const files = extractFiles(result)

// Deploy files to GitHub or filesystem
```

### Invariant Files (`invariants/`)

Core infrastructure files injected into every generated app.

#### `fastformClient.ts`

API client for communicating with the Fastform backend.

**Exports:**
- `fastformApi.submitForm(appId, data)` - Submit a form
- `fastformApi.getSubmissions(appId, status?)` - Get submissions
- `fastformApi.getSubmission(submissionId)` - Get single submission
- `fastformApi.updateSubmissionStatus(submissionId, status, notes?)` - Update status
- `fastformApi.resubmitSubmission(submissionId, data)` - Resubmit with updates

**Environment Variables:**
- `NEXT_PUBLIC_FASTFORM_API_URL` - API base URL (defaults to production)
- `FASTFORM_API_KEY` - Server-side API key (optional)

#### `analytics.ts`

Event tracking integration for monitoring app usage.

**Exports:**
- `trackEvent(eventName, properties?)` - Track any event
- `trackPageView(pagePath, pageTitle?)` - Track page views
- `trackFormSubmission(formId, fieldCount)` - Track form submissions
- `trackTransition(submissionId, fromState, toState)` - Track workflow transitions

**Behavior:**
- Development: Logs to console
- Production: Sends to Fastform analytics API

**Environment Variables:**
- `NEXT_PUBLIC_APP_ID` - App identifier for analytics
- `NEXT_PUBLIC_FASTFORM_API_URL` - API base URL

#### `auth-middleware.ts`

JWT authentication and session validation.

**Exports:**
- `validateSession(token)` - Validate JWT token
- `hasRole(session, role)` - Check user role
- `getSessionFromRequest(request)` - Extract session from cookies

**Environment Variables:**
- `FASTFORM_JWT_SECRET` - JWT signing secret

**Session Structure:**
```typescript
interface SessionPayload {
  userId: string
  email: string
  roles: string[]
  orgId: string
  exp: number
}
```

#### `middleware.ts`

Next.js middleware for route protection.

**Features:**
- Validates authentication on protected routes
- Checks role requirements
- Redirects unauthorized users to login
- Supports dynamic route patterns

**Configuration:**
Route configuration is generated from AppSpec during injection.

## Template Variables

The post-processor replaces the following placeholders:

- `{{APP_ID}}` - Application ID (UUID)
- `{{APP_SLUG}}` - URL-safe app slug
- `{{ORG_ID}}` - Organization ID (UUID)
- `{{ORG_SLUG}}` - URL-safe org slug

## API Reference

### `injectInvariants(v0GeneratedCode: string, appSpec: FastformAppSpec): Promise<InjectionResult>`

Main entry point for the post-processor.

**Parameters:**
- `v0GeneratedCode` - Raw code output from v0
- `appSpec` - FastformAppSpec defining the app

**Returns:**
```typescript
interface InjectionResult {
  original: string          // Original v0 code
  modified: string          // Code with injected invariants
  injectedFiles: string[]   // List of injected file paths
}
```

### `extractFiles(injectionResult: InjectionResult): Record<string, string>`

Extract individual files from injection result.

**Parameters:**
- `injectionResult` - Result from `injectInvariants`

**Returns:**
Map of file paths to content.

### `validateInjectedFiles(files: Record<string, string>): boolean`

Validate that all required files are present.

**Parameters:**
- `files` - Map of file paths to content

**Returns:**
`true` if all required files are present.

### Helper Functions

#### `createFastformClient(): Promise<string>`
Load the fastformClient.ts invariant file.

#### `createAnalytics(): Promise<string>`
Load the analytics.ts invariant file.

#### `createAuthMiddleware(): Promise<string>`
Load the auth-middleware.ts invariant file.

#### `createMiddleware(spec: FastformAppSpec): Promise<string>`
Generate middleware.ts with app-specific route configuration.

## Environment Variables

Generated apps require the following environment variables:

### Required

- `NEXT_PUBLIC_FASTFORM_API_URL` - Fastform API base URL
- `FASTFORM_JWT_SECRET` - JWT signing secret

### Optional

- `NEXT_PUBLIC_APP_ID` - App ID for analytics
- `FASTFORM_API_KEY` - Server-side API authentication

## Example Workflow

```typescript
import { injectInvariants, extractFiles, validateInjectedFiles } from './post-processor'
import { createAppRepo } from './github-repo'

async function deployApp(v0Code: string, appSpec: FastformAppSpec) {
  // Step 1: Inject invariants
  const result = await injectInvariants(v0Code, appSpec)
  console.log('Injected files:', result.injectedFiles)

  // Step 2: Extract individual files
  const files = extractFiles(result)

  // Step 3: Validate
  if (!validateInjectedFiles(files)) {
    throw new Error('Missing required files')
  }

  // Step 4: Create GitHub repo
  const { repoUrl } = await createAppRepo(
    appSpec.meta.orgId,
    appSpec.meta.slug
  )

  // Step 5: Deploy files to repo
  // (Implementation depends on deployment strategy)

  console.log('App deployed to:', repoUrl)
}
```

## Testing

Run tests with:

```bash
npm test lib/deploy/post-processor.test.ts
```

Test coverage includes:
- Invariant injection
- Template variable replacement
- File extraction
- Validation
- Middleware route configuration
- Integration scenarios

## File Structure

```
lib/deploy/
├── README.md                      # This file
├── vercel-deploy.ts               # Main deployment orchestrator
├── vercel-deploy.test.ts          # Comprehensive tests
├── post-processor.ts              # Code post-processor
├── github-repo.ts                 # GitHub integration
├── DEPLOYMENTS_SCHEMA.md          # Database schema documentation
└── invariants/
    ├── fastformClient.ts          # API client
    ├── analytics.ts               # Event tracking
    ├── auth-middleware.ts         # Session validation
    └── middleware.ts              # Route protection
```

## Design Principles

1. **Production-Ready**: No placeholders or TODOs - all code is deployable
2. **Type Safety**: Full TypeScript types throughout
3. **Error Handling**: Comprehensive error handling with meaningful messages
4. **Testability**: Designed for easy unit and integration testing
5. **Modularity**: Clean separation of concerns

## Vercel Deployment Orchestrator

### Overview

The `vercel-deploy.ts` module orchestrates the complete deployment pipeline from AppSpec to live Vercel deployment.

### Main Function

#### `triggerStagingDeploy(appId: string): Promise<StagingDeploymentResult>`

Triggers a complete staging deployment for an app.

**Pipeline Steps:**
1. Fetch AppSpec from database
2. Compile AppSpec to prompt
3. Generate code with v0
4. Post-process with invariant injection
5. Create/verify GitHub repository
6. Commit generated code to staging branch
7. Poll Vercel API for deployment completion

**Returns:**
```typescript
interface StagingDeploymentResult {
  stagingUrl: string        // Live deployment URL
  deploymentId: string      // Vercel deployment ID
  githubCommitSha: string   // Git commit SHA
  repoUrl: string           // GitHub repository URL
  status: 'ready'
}
```

**Example:**
```typescript
import { triggerStagingDeploy } from '@/lib/deploy/vercel-deploy'

const result = await triggerStagingDeploy('app-uuid')
console.log('Deployed to:', result.stagingUrl)
```

### Error Types

#### `DeploymentError`

Thrown when deployment fails at any pipeline stage.

```typescript
class DeploymentError extends Error {
  phase: DeploymentPhase
  cause?: unknown
}

type DeploymentPhase =
  | 'fetch_appspec'
  | 'compile_prompt'
  | 'generate_code'
  | 'post_process'
  | 'create_repo'
  | 'commit_code'
  | 'poll_deployment'
```

#### `CodeGenerationError`

Thrown when v0 code generation fails.

```typescript
class CodeGenerationError extends Error {
  appId: string
  cause?: unknown
}
```

#### `GitHubCommitError`

Thrown when GitHub operations fail.

```typescript
class GitHubCommitError extends Error {
  repoName: string
  cause?: unknown
}
```

### Configuration

Required environment variables:

```bash
# GitHub Personal Access Token
GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"

# v0 API Key
V0_API_KEY="v0_xxxxxxxxxxxxx"

# Vercel API Token
VERCEL_TOKEN="xxxxxxxxxxxxxx"

# Optional: Vercel Team ID
VERCEL_TEAM_ID="team_xxxxxxxxxxxxx"
```

### Deployment Flow

```
AppSpec → Prompt → v0 Code → Post-Process → GitHub → Vercel → Live URL
```

See [DEPLOYMENTS_SCHEMA.md](./DEPLOYMENTS_SCHEMA.md) for database tracking schema.

## Future Enhancements

- Support for custom invariant files
- Intelligent code merging (vs prepending)
- Source map generation
- Incremental updates to existing deployments
- Custom middleware configurations
- Production deployment support
- Deployment rollback functionality
- Custom domain mapping
