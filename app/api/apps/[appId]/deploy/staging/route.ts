import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { getAppById } from '@/lib/db/queries'
import {
  triggerStagingDeploy,
  DeploymentError,
  CodeGenerationError,
  GitHubCommitError,
  type StagingDeploymentResult,
} from '@/lib/deploy/vercel-deploy'

/**
 * POST /api/apps/[appId]/deploy/staging
 *
 * Triggers a staging deployment for the specified app. This endpoint orchestrates
 * the complete deployment pipeline from AppSpec to live Vercel staging deployment.
 *
 * Authentication: Required
 * Authorization: User must own the app
 *
 * Request Body: None required
 *
 * Success Response:
 * {
 *   success: true,
 *   deployment: {
 *     status: 'ready',
 *     stagingUrl: string,
 *     deploymentId: string,
 *     githubCommitSha: string,
 *     repoUrl: string,
 *     message: string
 *   }
 * }
 *
 * Error Responses:
 * - 401: Not authenticated
 * - 403: User doesn't own the app
 * - 404: App not found
 * - 500: Deployment failed (includes error details and phase information)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { appId } = await params

    // Fetch the app from database
    const app = await getAppById({ appId })

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    // Authorization check: verify user owns the app
    if (app.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to deploy this app' },
        { status: 403 },
      )
    }

    // Validate that the app has an AppSpec
    if (!app.spec || (typeof app.spec === 'object' && Object.keys(app.spec).length === 0)) {
      return NextResponse.json(
        {
          error: 'App has no AppSpec',
          details: 'You must confirm an AppSpec before deploying',
        },
        { status: 400 },
      )
    }

    // Trigger the staging deployment
    // This is a synchronous operation that returns once deployment is ready
    const result: StagingDeploymentResult = await triggerStagingDeploy(appId)

    // Return success response
    return NextResponse.json({
      success: true,
      deployment: {
        status: result.status,
        stagingUrl: result.stagingUrl,
        deploymentId: result.deploymentId,
        githubCommitSha: result.githubCommitSha,
        repoUrl: result.repoUrl,
        message: 'Deployment completed successfully',
      },
    })
  } catch (error) {
    console.error('Staging deployment error:', error)

    // Handle specific deployment error types with detailed error messages
    if (error instanceof DeploymentError) {
      return NextResponse.json(
        {
          error: 'Deployment failed',
          phase: error.phase,
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (error instanceof CodeGenerationError) {
      return NextResponse.json(
        {
          error: 'Code generation failed',
          phase: 'generate_code',
          details: error.message,
          appId: error.appId,
        },
        { status: 500 },
      )
    }

    if (error instanceof GitHubCommitError) {
      return NextResponse.json(
        {
          error: 'GitHub commit failed',
          phase: 'commit_code',
          details: error.message,
          repoName: error.repoName,
        },
        { status: 500 },
      )
    }

    // Handle generic errors
    return NextResponse.json(
      {
        error: 'Deployment failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/apps/[appId]/deploy/staging
 *
 * Retrieves the latest staging deployment status for the specified app.
 * This endpoint can be used to poll for deployment status updates.
 *
 * Authentication: Required
 * Authorization: User must own the app
 *
 * Success Response:
 * {
 *   success: true,
 *   deployment: {
 *     status: 'ready' | 'deploying' | 'failed',
 *     stagingUrl: string | null,
 *     deploymentId: string | null,
 *     message: string
 *   }
 * }
 *
 * Error Responses:
 * - 401: Not authenticated
 * - 403: User doesn't own the app
 * - 404: App not found
 * - 500: Failed to retrieve deployment status
 *
 * Note: This is a placeholder implementation that returns basic status.
 * A full implementation would query the deployment database table or Vercel API.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { appId } = await params

    // Fetch the app from database
    const app = await getAppById({ appId })

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    // Authorization check: verify user owns the app
    if (app.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to access this app' },
        { status: 403 },
      )
    }

    // In a full implementation, this would query a deployments table in the database
    // or make a request to the Vercel API to get the latest deployment status.
    // For now, we return a simple response indicating no deployment history.
    return NextResponse.json({
      success: true,
      deployment: {
        status: 'no_deployment',
        stagingUrl: null,
        deploymentId: null,
        message: 'No deployment found. Trigger a deployment to get started.',
      },
    })
  } catch (error) {
    console.error('Deployment status retrieval error:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve deployment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
