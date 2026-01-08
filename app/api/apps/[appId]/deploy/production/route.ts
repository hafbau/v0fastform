import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getAppById } from '@/lib/db/queries'
import {
  promoteToProduction,
  ProductionPromotionError,
  DeploymentError,
  GitHubCommitError,
} from '@/lib/deploy/vercel-deploy'

/**
 * POST /api/apps/[appId]/deploy/production
 *
 * Promotes a staging deployment to production.
 *
 * Request:
 * - No body required
 * - Auth: User must own the app
 *
 * Workflow:
 * 1. Validate user authentication
 * 2. Verify user owns the app
 * 3. Verify staging deployment exists and succeeded
 * 4. Call promoteToProduction(appId)
 * 5. Return production deployment info
 *
 * Response (200):
 * {
 *   success: true,
 *   deployment: {
 *     status: 'ready',
 *     productionUrl: string,
 *     deploymentId: string,
 *     message: 'Successfully deployed to production'
 *   }
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 403: User doesn't own app
 * - 404: App not found
 * - 400: No staging deployment found or staging deployment failed
 * - 500: Production promotion failed (includes error message)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    // ========================================================================
    // PHASE 1: Validate authentication
    // ========================================================================
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          message: 'You must be signed in to deploy to production',
        },
        { status: 401 }
      )
    }

    // ========================================================================
    // PHASE 2: Get app ID and verify app exists
    // ========================================================================
    const { appId } = await params
    const app = await getAppById({ appId })

    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: 'App not found',
          message: `App with ID ${appId} does not exist`,
        },
        { status: 404 }
      )
    }

    // ========================================================================
    // PHASE 3: Verify user owns the app
    // ========================================================================
    if (app.userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to deploy this app',
        },
        { status: 403 }
      )
    }

    // ========================================================================
    // PHASE 4: Promote to production
    // ========================================================================
    console.log(
      `[API] Starting production promotion for app ${appId} by user ${session.user.id}`
    )

    const result = await promoteToProduction(appId)

    console.log(`[API] Production promotion successful for app ${appId}`)
    console.log(`[API] Production URL: ${result.productionUrl}`)

    // ========================================================================
    // PHASE 5: Return success response
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        deployment: {
          status: result.status,
          productionUrl: result.productionUrl,
          deploymentId: result.deploymentId,
          githubCommitSha: result.githubCommitSha,
          mergedAt: result.mergedAt,
          repoUrl: result.repoUrl,
          message: 'Successfully deployed to production',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    console.error('[API] Production promotion failed:', error)

    // Handle ProductionPromotionError (specific validation failures)
    if (error instanceof ProductionPromotionError) {
      const statusCode = error.phase === 'verify_staging' ? 400 : 500

      return NextResponse.json(
        {
          success: false,
          error: 'Production promotion failed',
          message: error.message,
          phase: error.phase,
          appId: error.appId,
          rollbackInfo: error.rollbackInfo,
        },
        { status: statusCode }
      )
    }

    // Handle DeploymentError (Vercel deployment issues)
    if (error instanceof DeploymentError) {
      let statusCode = 500
      let message = error.message

      // Specific error handling based on phase
      if (error.phase === 'poll_deployment') {
        if (message.includes('No staging deployment found')) {
          statusCode = 400
        } else if (message.includes('not ready')) {
          statusCode = 400
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Deployment error',
          message,
          phase: error.phase,
        },
        { status: statusCode }
      )
    }

    // Handle GitHubCommitError (GitHub merge issues)
    if (error instanceof GitHubCommitError) {
      return NextResponse.json(
        {
          success: false,
          error: 'GitHub merge failed',
          message: error.message,
          repoName: error.repoName,
        },
        { status: 500 }
      )
    }

    // Handle unknown errors
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during production promotion',
      },
      { status: 500 }
    )
  }
}
