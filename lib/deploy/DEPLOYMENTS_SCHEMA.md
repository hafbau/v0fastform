# Deployments Table Schema

This document describes the database schema for tracking Vercel deployments. This table should be created to enable full deployment tracking and history.

## Table: `deployments`

Tracks all staging and production deployments for generated apps.

### Schema Definition

```typescript
// TypeScript/Drizzle ORM schema
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'

export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  appId: uuid('appId')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  environment: varchar('environment', { length: 20 }).notNull(), // 'staging' | 'production'
  status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'building' | 'ready' | 'failed'
  deploymentUrl: varchar('deploymentUrl', { length: 255 }),
  githubCommitSha: varchar('githubCommitSha', { length: 64 }),
  vercelDeploymentId: varchar('vercelDeploymentId', { length: 64 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
```

### SQL Migration

```sql
-- Create deployments table
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "appId" UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  environment VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  "deploymentUrl" VARCHAR(255),
  "githubCommitSha" VARCHAR(64),
  "vercelDeploymentId" VARCHAR(64),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on appId for fast lookups
CREATE INDEX idx_deployments_app_id ON deployments("appId");

-- Create index on environment for filtering
CREATE INDEX idx_deployments_environment ON deployments(environment);

-- Create index on status for filtering
CREATE INDEX idx_deployments_status ON deployments(status);

-- Create composite index for common query pattern (latest deployment per app/env)
CREATE INDEX idx_deployments_app_env_created
  ON deployments("appId", environment, "createdAt" DESC);

-- Add constraint to ensure valid environment values
ALTER TABLE deployments
  ADD CONSTRAINT check_environment
  CHECK (environment IN ('staging', 'production'));

-- Add constraint to ensure valid status values
ALTER TABLE deployments
  ADD CONSTRAINT check_status
  CHECK (status IN ('pending', 'building', 'ready', 'failed'));
```

### Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | Primary key, auto-generated |
| `appId` | UUID | NO | Foreign key to `apps` table, cascades on delete |
| `environment` | VARCHAR(20) | NO | Deployment environment: `staging` or `production` |
| `status` | VARCHAR(20) | NO | Deployment status: `pending`, `building`, `ready`, or `failed` |
| `deploymentUrl` | VARCHAR(255) | YES | Full URL to deployed app (e.g., https://app-staging.vercel.app) |
| `githubCommitSha` | VARCHAR(64) | YES | Git commit SHA that was deployed |
| `vercelDeploymentId` | VARCHAR(64) | YES | Vercel deployment ID for API queries |
| `createdAt` | TIMESTAMP | NO | When deployment was initiated |
| `updatedAt` | TIMESTAMP | NO | When deployment record was last updated |

### Status Values

- **`pending`**: Deployment has been queued but GitHub push hasn't completed
- **`building`**: Vercel has received the webhook and is building the app
- **`ready`**: Deployment is live and accessible
- **`failed`**: Deployment failed (build error, timeout, etc.)

### Environment Values

- **`staging`**: Staging environment (deployed from `staging` branch)
- **`production`**: Production environment (deployed from `main` branch)

## Usage Examples

### Tracking a New Deployment

```typescript
import { db } from '@/lib/db'
import { deployments } from '@/lib/db/schema'

// Create deployment record when starting deployment
const [deployment] = await db
  .insert(deployments)
  .values({
    appId: 'app-uuid',
    environment: 'staging',
    status: 'pending',
    githubCommitSha: 'abc123',
  })
  .returning()

// Update when Vercel deployment is detected
await db
  .update(deployments)
  .set({
    status: 'building',
    vercelDeploymentId: 'deployment-id-from-vercel',
    updatedAt: new Date(),
  })
  .where(eq(deployments.id, deployment.id))

// Update when deployment completes
await db
  .update(deployments)
  .set({
    status: 'ready',
    deploymentUrl: 'https://app-staging.vercel.app',
    updatedAt: new Date(),
  })
  .where(eq(deployments.id, deployment.id))
```

### Querying Deployment History

```typescript
import { db } from '@/lib/db'
import { deployments } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// Get latest staging deployment for an app
const [latestStaging] = await db
  .select()
  .from(deployments)
  .where(
    and(
      eq(deployments.appId, 'app-uuid'),
      eq(deployments.environment, 'staging')
    )
  )
  .orderBy(desc(deployments.createdAt))
  .limit(1)

// Get all deployments for an app
const appDeployments = await db
  .select()
  .from(deployments)
  .where(eq(deployments.appId, 'app-uuid'))
  .orderBy(desc(deployments.createdAt))

// Get failed deployments
const failedDeployments = await db
  .select()
  .from(deployments)
  .where(eq(deployments.status, 'failed'))
  .orderBy(desc(deployments.createdAt))
```

### Integration with triggerStagingDeploy

```typescript
import { triggerStagingDeploy } from '@/lib/deploy/vercel-deploy'
import { db } from '@/lib/db'
import { deployments } from '@/lib/db/schema'

async function deployWithTracking(appId: string) {
  // Create initial deployment record
  const [deployment] = await db
    .insert(deployments)
    .values({
      appId,
      environment: 'staging',
      status: 'pending',
    })
    .returning()

  try {
    // Trigger deployment
    const result = await triggerStagingDeploy(appId)

    // Update with success
    await db
      .update(deployments)
      .set({
        status: 'ready',
        deploymentUrl: result.stagingUrl,
        githubCommitSha: result.githubCommitSha,
        vercelDeploymentId: result.deploymentId,
        updatedAt: new Date(),
      })
      .where(eq(deployments.id, deployment.id))

    return result
  } catch (error) {
    // Update with failure
    await db
      .update(deployments)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(deployments.id, deployment.id))

    throw error
  }
}
```

## Indexes and Performance

The table includes several indexes to optimize common query patterns:

1. **`idx_deployments_app_id`**: Fast lookups by app
2. **`idx_deployments_environment`**: Filter by staging/production
3. **`idx_deployments_status`**: Find all failed or building deployments
4. **`idx_deployments_app_env_created`**: Composite index for "latest deployment per app/environment" queries

## Migration Path

To add this table to an existing database:

1. Create a new migration file in `lib/db/migrations/`
2. Add the SQL from the "SQL Migration" section above
3. Run the migration: `npm run db:migrate`

Example migration filename: `0003_add_deployments_table.sql`

## Future Enhancements

Potential columns to add in future versions:

- `buildDurationMs`: Time taken to build (milliseconds)
- `errorMessage`: Error details if deployment failed
- `triggeredBy`: User ID who triggered the deployment
- `buildLogs`: URL to Vercel build logs
- `previousDeploymentId`: Reference to previous deployment for rollback
- `isRollback`: Boolean flag indicating if this is a rollback deployment

## Related Documentation

- [Vercel Deployment Orchestrator](./vercel-deploy.ts)
- [Database Schema](../db/schema.ts)
- [API Routes for Deployments](../../app/api/apps/[appId]/deploy/)
