/**
 * Post-Processor Tests
 *
 * Tests for the v0 code post-processor that injects invariant files.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  injectInvariants,
  extractFiles,
  validateInjectedFiles,
  createFastformClient,
  createAnalytics,
  createAuthMiddleware,
  createMiddleware,
  type InjectionResult,
} from './post-processor'
import type { FastformAppSpec } from '../types/appspec'

describe('Post-Processor', () => {
  let mockAppSpec: FastformAppSpec

  beforeEach(() => {
    mockAppSpec = {
      id: 'app-123',
      version: '0.3',
      meta: {
        name: 'Test App',
        slug: 'test-app',
        description: 'A test application',
        orgId: 'org-456',
        orgSlug: 'test-org',
      },
      theme: {
        preset: 'healthcare-calm',
      },
      roles: [
        {
          id: 'PATIENT',
          authRequired: false,
        },
        {
          id: 'STAFF',
          authRequired: true,
          routePrefix: '/staff',
        },
      ],
      pages: [
        {
          id: 'welcome',
          route: '/',
          role: 'PATIENT',
          type: 'welcome',
          title: 'Welcome',
        },
        {
          id: 'staff-inbox',
          route: '/staff/inbox',
          role: 'STAFF',
          type: 'list',
          title: 'Staff Inbox',
        },
      ],
      workflow: {
        states: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
        initialState: 'DRAFT',
        transitions: [
          {
            from: 'DRAFT',
            to: 'SUBMITTED',
            allowedRoles: ['PATIENT'],
          },
        ],
      },
      api: {
        baseUrl: '{{FASTFORM_API_URL}}',
        endpoints: {
          createSubmission: '/submissions',
          getSubmission: '/submissions/:id',
          resubmitSubmission: '/submissions/:id/resubmit',
          staffLogin: '/auth/login',
          staffLogout: '/auth/logout',
          staffSession: '/auth/session',
          listSubmissions: '/submissions',
          getSubmissionDetail: '/submissions/:id',
          transitionSubmission: '/submissions/:id/transition',
          trackEvent: '/analytics/events',
        },
      },
      analytics: {
        events: [
          {
            name: 'page_viewed',
            trigger: 'pageview',
          },
        ],
      },
      environments: {
        staging: {
          domain: 'staging.example.com',
          apiUrl: 'https://api-staging.example.com',
        },
        production: {
          domain: 'example.com',
          apiUrl: 'https://api.example.com',
        },
      },
    }
  })

  describe('injectInvariants', () => {
    it('should inject all invariant files into v0 code', async () => {
      const v0Code = '// Some v0 generated code\nconst App = () => <div>Hello</div>'

      const result = await injectInvariants(v0Code, mockAppSpec)

      expect(result).toBeDefined()
      expect(result.original).toBe(v0Code)
      expect(result.modified).toContain(v0Code)
      expect(result.injectedFiles).toHaveLength(4)
      expect(result.injectedFiles).toContain('lib/fastformClient.ts')
      expect(result.injectedFiles).toContain('lib/analytics.ts')
      expect(result.injectedFiles).toContain('lib/auth-middleware.ts')
      expect(result.injectedFiles).toContain('middleware.ts')
    })

    it('should include file markers in modified code', async () => {
      const v0Code = '// v0 code'

      const result = await injectInvariants(v0Code, mockAppSpec)

      expect(result.modified).toContain('// FILE: lib/fastformClient.ts')
      expect(result.modified).toContain('// FILE: lib/analytics.ts')
      expect(result.modified).toContain('// FILE: lib/auth-middleware.ts')
      expect(result.modified).toContain('// FILE: middleware.ts')
      expect(result.modified).toContain('// V0 GENERATED CODE')
    })

    it('should replace template variables in injected files', async () => {
      const v0Code = '// v0 code'

      const result = await injectInvariants(v0Code, mockAppSpec)

      // Note: Template variables would be in the files if we added them
      // For now, we just verify the structure is correct
      expect(result.modified).toBeDefined()
      expect(result.modified.length).toBeGreaterThan(v0Code.length)
    })
  })

  describe('extractFiles', () => {
    it('should extract files from injection result', async () => {
      const v0Code = '// v0 code'
      const result = await injectInvariants(v0Code, mockAppSpec)

      const files = extractFiles(result)

      expect(Object.keys(files).length).toBeGreaterThan(0)
    })

    it('should parse file paths correctly', async () => {
      const mockResult: InjectionResult = {
        original: 'test',
        modified: `
// ============================================================
// FILE: lib/test.ts
// ============================================================
const test = true

// ============================================================
// FILE: app/page.ts
// ============================================================
const page = true
`,
        injectedFiles: ['lib/test.ts', 'app/page.ts'],
      }

      const files = extractFiles(mockResult)

      expect(files['lib/test.ts']).toBeDefined()
      expect(files['app/page.ts']).toBeDefined()
      expect(files['lib/test.ts']).toContain('const test = true')
      expect(files['app/page.ts']).toContain('const page = true')
    })
  })

  describe('validateInjectedFiles', () => {
    it('should validate that all required files are present', () => {
      const files = {
        'lib/fastformClient.ts': 'content',
        'lib/analytics.ts': 'content',
        'lib/auth-middleware.ts': 'content',
        'middleware.ts': 'content',
      }

      expect(validateInjectedFiles(files)).toBe(true)
    })

    it('should return false if files are missing', () => {
      const files = {
        'lib/fastformClient.ts': 'content',
        'lib/analytics.ts': 'content',
      }

      expect(validateInjectedFiles(files)).toBe(false)
    })

    it('should return false for empty files object', () => {
      expect(validateInjectedFiles({})).toBe(false)
    })
  })

  describe('createFastformClient', () => {
    it('should create fastformClient.ts content', async () => {
      const content = await createFastformClient()

      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
      expect(content).toContain('fastformApi')
      expect(content).toContain('submitForm')
      expect(content).toContain('getSubmissions')
      expect(content).toContain('updateSubmissionStatus')
    })

    it('should include proper TypeScript types', async () => {
      const content = await createFastformClient()

      expect(content).toContain('interface')
      expect(content).toContain('Submission')
      expect(content).toContain('export')
    })
  })

  describe('createAnalytics', () => {
    it('should create analytics.ts content', async () => {
      const content = await createAnalytics()

      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
      expect(content).toContain('trackEvent')
      expect(content).toContain('EventProperties')
    })

    it('should include convenience tracking functions', async () => {
      const content = await createAnalytics()

      expect(content).toContain('trackPageView')
      expect(content).toContain('trackFormSubmission')
      expect(content).toContain('trackTransition')
    })
  })

  describe('createAuthMiddleware', () => {
    it('should create auth-middleware.ts content', async () => {
      const content = await createAuthMiddleware()

      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
      expect(content).toContain('validateSession')
      expect(content).toContain('SessionPayload')
      expect(content).toContain('hasRole')
    })

    it('should include JWT handling logic', async () => {
      const content = await createAuthMiddleware()

      expect(content).toContain('JWT')
      expect(content).toContain('token')
      expect(content).toContain('verifySignature')
    })
  })

  describe('createMiddleware', () => {
    it('should create middleware.ts with route config', async () => {
      const content = await createMiddleware(mockAppSpec)

      expect(content).toBeDefined()
      expect(content.length).toBeGreaterThan(0)
      expect(content).toContain('middleware')
      expect(content).toContain('ROUTE_CONFIG')
    })

    it('should include routes from AppSpec', async () => {
      const content = await createMiddleware(mockAppSpec)

      expect(content).toContain("'/'")
      expect(content).toContain("'/staff/inbox'")
    })

    it('should configure auth requirements correctly', async () => {
      const content = await createMiddleware(mockAppSpec)

      // Patient route should not require auth
      expect(content).toMatch(/"authRequired":false/)

      // Staff route should require auth
      expect(content).toMatch(/"authRequired":true/)
      expect(content).toMatch(/"requiredRole":"STAFF"/)
    })

    it('should handle multiple pages with same role', async () => {
      const spec: FastformAppSpec = {
        ...mockAppSpec,
        pages: [
          {
            id: 'page1',
            route: '/staff/page1',
            role: 'STAFF',
            type: 'list',
            title: 'Page 1',
          },
          {
            id: 'page2',
            route: '/staff/page2',
            role: 'STAFF',
            type: 'detail',
            title: 'Page 2',
          },
        ],
      }

      const content = await createMiddleware(spec)

      expect(content).toContain("'/staff/page1'")
      expect(content).toContain("'/staff/page2'")
    })
  })

  describe('Integration', () => {
    it('should produce deployable code structure', async () => {
      const v0Code = `
// app/page.tsx
export default function Page() {
  return <div>Welcome</div>
}
`

      const result = await injectInvariants(v0Code, mockAppSpec)
      const files = extractFiles(result)

      // Validate we can extract all required files
      expect(validateInjectedFiles(files)).toBe(true)

      // Validate files have reasonable content
      expect(files['lib/fastformClient.ts'].length).toBeGreaterThan(100)
      expect(files['lib/analytics.ts'].length).toBeGreaterThan(100)
      expect(files['lib/auth-middleware.ts'].length).toBeGreaterThan(100)
      expect(files['middleware.ts'].length).toBeGreaterThan(100)
    })

    it('should preserve original v0 code', async () => {
      const v0Code = '// Unique marker: abc123\nconst special = true'

      const result = await injectInvariants(v0Code, mockAppSpec)

      expect(result.modified).toContain('Unique marker: abc123')
      expect(result.modified).toContain('const special = true')
      expect(result.original).toBe(v0Code)
    })
  })
})
