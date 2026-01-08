import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock dependencies
vi.mock('@/app/(auth)/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db/queries', () => ({
  getAppById: vi.fn(),
}))

vi.mock('@/lib/deploy/vercel-deploy', () => ({
  promoteToProduction: vi.fn(),
  ProductionPromotionError: class ProductionPromotionError extends Error {
    constructor(
      message: string,
      public readonly appId: string,
      public readonly phase: 'verify_staging' | 'merge_branches' | 'poll_production',
      public readonly rollbackInfo?: {
        stagingDeploymentId: string
        stagingUrl: string
        lastKnownGoodSha?: string
      },
      public readonly cause?: unknown
    ) {
      super(message)
      this.name = 'ProductionPromotionError'
    }
  },
  DeploymentError: class DeploymentError extends Error {
    constructor(
      message: string,
      public readonly phase: string,
      public readonly cause?: unknown
    ) {
      super(message)
      this.name = 'DeploymentError'
    }
  },
  GitHubCommitError: class GitHubCommitError extends Error {
    constructor(
      message: string,
      public readonly repoName: string,
      public readonly cause?: Error
    ) {
      super(message)
      this.name = 'GitHubCommitError'
    }
  },
}))

import { auth } from '@/app/(auth)/auth'
import { getAppById } from '@/lib/db/queries'
import {
  promoteToProduction,
  ProductionPromotionError,
  DeploymentError,
  GitHubCommitError,
} from '@/lib/deploy/vercel-deploy'

describe('POST /api/apps/[appId]/deploy/production', () => {
  const mockAppId = 'test-app-id'
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = () => {
    return new NextRequest('http://localhost:3000/api/apps/test-app-id/deploy/production', {
      method: 'POST',
    })
  }

  const createMockParams = () => {
    return Promise.resolve({ appId: mockAppId })
  }

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not authenticated')
    })

    it('should return 401 when session exists but user.id is missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {},
      } as any)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.success).toBe(false)
    })
  })

  describe('App Validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as any)
    })

    it('should return 404 when app does not exist', async () => {
      vi.mocked(getAppById).mockResolvedValue(undefined)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.success).toBe(false)
      expect(body.error).toBe('App not found')
    })

    it('should return 403 when user does not own the app', async () => {
      vi.mocked(getAppById).mockResolvedValue({
        id: mockAppId,
        userId: 'different-user-id',
        name: 'Test App',
        spec: {},
        createdAt: new Date(),
      } as any)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Forbidden')
    })
  })

  describe('Successful Production Promotion', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as any)

      vi.mocked(getAppById).mockResolvedValue({
        id: mockAppId,
        userId: mockUserId,
        name: 'Test App',
        spec: { meta: { name: 'Test App' } },
        createdAt: new Date(),
      } as any)
    })

    it('should successfully promote to production', async () => {
      const mockResult = {
        productionUrl: 'https://test-app.vercel.app',
        deploymentId: 'deployment-123',
        githubCommitSha: 'abc123',
        mergedAt: '2026-01-08T12:00:00Z',
        repoUrl: 'https://github.com/getfastform/test-repo',
        status: 'ready' as const,
      }

      vi.mocked(promoteToProduction).mockResolvedValue(mockResult)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.deployment).toEqual({
        status: 'ready',
        productionUrl: mockResult.productionUrl,
        deploymentId: mockResult.deploymentId,
        githubCommitSha: mockResult.githubCommitSha,
        mergedAt: mockResult.mergedAt,
        repoUrl: mockResult.repoUrl,
        message: 'Successfully deployed to production',
      })

      expect(promoteToProduction).toHaveBeenCalledWith(mockAppId)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as any)

      vi.mocked(getAppById).mockResolvedValue({
        id: mockAppId,
        userId: mockUserId,
        name: 'Test App',
        spec: { meta: { name: 'Test App' } },
        createdAt: new Date(),
      } as any)
    })

    it('should handle ProductionPromotionError with verify_staging phase (400)', async () => {
      const error = new ProductionPromotionError(
        'No staging deployment found',
        mockAppId,
        'verify_staging',
        {
          stagingDeploymentId: 'staging-123',
          stagingUrl: 'https://test-staging.vercel.app',
        }
      )

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Production promotion failed')
      expect(body.message).toBe('No staging deployment found')
      expect(body.phase).toBe('verify_staging')
      expect(body.appId).toBe(mockAppId)
    })

    it('should handle ProductionPromotionError with merge_branches phase (500)', async () => {
      const error = new ProductionPromotionError(
        'Failed to merge staging to main',
        mockAppId,
        'merge_branches'
      )

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.phase).toBe('merge_branches')
    })

    it('should handle DeploymentError for missing staging deployment (400)', async () => {
      const error = new DeploymentError(
        'No staging deployment found. Please deploy to staging first.',
        'poll_deployment'
      )

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Deployment error')
      expect(body.message).toContain('No staging deployment found')
    })

    it('should handle DeploymentError for staging not ready (400)', async () => {
      const error = new DeploymentError(
        'Staging deployment is not ready (status: BUILDING)',
        'poll_deployment'
      )

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.message).toContain('not ready')
    })

    it('should handle DeploymentError for other deployment issues (500)', async () => {
      const error = new DeploymentError(
        'Production deployment timed out',
        'poll_deployment'
      )

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Deployment error')
    })

    it('should handle GitHubCommitError', async () => {
      const error = new GitHubCommitError(
        'Failed to merge branches',
        'test-repo'
      )

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('GitHub merge failed')
      expect(body.repoName).toBe('test-repo')
    })

    it('should handle unknown errors', async () => {
      const error = new Error('Unexpected error')

      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Internal server error')
      expect(body.message).toBe('Unexpected error')
    })

    it('should handle non-Error thrown values', async () => {
      vi.mocked(promoteToProduction).mockRejectedValue('String error')

      const request = createMockRequest()
      const params = createMockParams()

      const response = await POST(request, { params })
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Internal server error')
      expect(body.message).toContain('unexpected error')
    })
  })

  describe('Logging', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId },
      } as any)

      vi.mocked(getAppById).mockResolvedValue({
        id: mockAppId,
        userId: mockUserId,
        name: 'Test App',
        spec: { meta: { name: 'Test App' } },
        createdAt: new Date(),
      } as any)
    })

    it('should log success when promotion succeeds', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const mockResult = {
        productionUrl: 'https://test-app.vercel.app',
        deploymentId: 'deployment-123',
        githubCommitSha: 'abc123',
        mergedAt: '2026-01-08T12:00:00Z',
        repoUrl: 'https://github.com/getfastform/test-repo',
        status: 'ready' as const,
      }

      vi.mocked(promoteToProduction).mockResolvedValue(mockResult)

      const request = createMockRequest()
      const params = createMockParams()

      await POST(request, { params })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API] Starting production promotion')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API] Production promotion successful')
      )
    })

    it('should log errors when promotion fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')

      const error = new Error('Test error')
      vi.mocked(promoteToProduction).mockRejectedValue(error)

      const request = createMockRequest()
      const params = createMockParams()

      await POST(request, { params })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API] Production promotion failed'),
        error
      )
    })
  })
})
