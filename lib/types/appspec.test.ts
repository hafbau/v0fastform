import { describe, it, expect } from 'vitest'
import {
  isValidAppSpec,
  type FastformAppSpec,
  type AppMeta,
  type ThemeConfig,
  type Role,
  type Page,
  type Field,
  type WorkflowConfig,
  type ApiConfig,
  type AnalyticsConfig,
  type EnvironmentConfig,
} from './appspec'

describe('AppSpec Type System', () => {
  // Valid minimal AppSpec for testing
  const createValidAppSpec = (): FastformAppSpec => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    version: '0.3',
    meta: {
      name: 'Test App',
      slug: 'test-app',
      description: 'A test application',
      orgId: '123e4567-e89b-12d3-a456-426614174001',
      orgSlug: 'test-org',
    },
    theme: {
      preset: 'healthcare-calm',
    },
    roles: [
      { id: 'PATIENT', authRequired: false },
      { id: 'STAFF', authRequired: true, routePrefix: '/staff' },
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
        id: 'staff-login',
        route: '/staff/login',
        role: 'STAFF',
        type: 'login',
        title: 'Staff Login',
      },
    ],
    workflow: {
      states: ['DRAFT', 'SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'REJECTED'],
      initialState: 'DRAFT',
      transitions: [
        { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
        { from: 'SUBMITTED', to: 'APPROVED', allowedRoles: ['STAFF'] },
      ],
    },
    api: {
      baseUrl: '{{FASTFORM_API_URL}}',
      endpoints: {
        createSubmission: 'POST /api/apps/:appId/submissions',
        getSubmission: 'GET /api/apps/:appId/submissions/:id',
        resubmitSubmission: 'POST /api/apps/:appId/submissions/:id/resubmit',
        staffLogin: 'POST /api/apps/:appId/staff/login',
        staffLogout: 'POST /api/apps/:appId/staff/logout',
        staffSession: 'GET /api/apps/:appId/staff/session',
        listSubmissions: 'GET /api/apps/:appId/staff/inbox',
        getSubmissionDetail: 'GET /api/apps/:appId/staff/submissions/:id',
        transitionSubmission:
          'POST /api/apps/:appId/staff/submissions/:id/transition',
        trackEvent: 'POST /api/apps/:appId/events',
      },
    },
    analytics: {
      events: [
        { name: 'page_view', trigger: 'pageview', page: '/' },
        { name: 'form_submit', trigger: 'submit' },
      ],
    },
    environments: {
      staging: {
        domain: 'test-app-test-org-staging.getfastform.com',
        apiUrl: 'https://api-staging.getfastform.com',
      },
      production: {
        domain: 'test-app-test-org.getfastform.com',
        apiUrl: 'https://api.getfastform.com',
      },
    },
  })

  describe('isValidAppSpec type guard', () => {
    describe('valid AppSpec', () => {
      it('should accept a valid minimal AppSpec', () => {
        const spec = createValidAppSpec()
        expect(isValidAppSpec(spec)).toBe(true)
      })

      it('should accept AppSpec with optional fields', () => {
        const spec = createValidAppSpec()
        spec.theme.logo = 'https://example.com/logo.png'
        spec.theme.colors = {
          primary: '#7FFFD4',
          background: '#F0F8FF',
          text: '#1F2937',
        }
        expect(isValidAppSpec(spec)).toBe(true)
      })

      it('should accept AppSpec with complex pages', () => {
        const spec = createValidAppSpec()
        spec.pages.push({
          id: 'intake-form',
          route: '/intake',
          role: 'PATIENT',
          type: 'form',
          title: 'Intake Form',
          description: 'Fill out your information',
          fields: [
            {
              id: 'firstName',
              type: 'text',
              label: 'First Name',
              required: true,
            },
            {
              id: 'email',
              type: 'email',
              label: 'Email',
              required: true,
              validation: [
                {
                  type: 'pattern',
                  value: '^[^@]+@[^@]+\\.[^@]+$',
                  message: 'Invalid email format',
                },
              ],
            },
            {
              id: 'state',
              type: 'select',
              label: 'State',
              required: true,
              options: [
                { value: 'CA', label: 'California' },
                { value: 'NY', label: 'New York' },
              ],
            },
          ],
        })
        expect(isValidAppSpec(spec)).toBe(true)
      })

      it('should accept AppSpec with actions', () => {
        const spec = createValidAppSpec()
        spec.pages.push({
          id: 'staff-detail',
          route: '/staff/submission/[id]',
          role: 'STAFF',
          type: 'detail',
          title: 'Submission Detail',
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              targetState: 'APPROVED',
              variant: 'primary',
            },
            {
              id: 'reject',
              label: 'Reject',
              targetState: 'REJECTED',
              requiresNote: true,
              variant: 'danger',
            },
          ],
        })
        expect(isValidAppSpec(spec)).toBe(true)
      })

      it('should accept AppSpec with transitions from multiple states', () => {
        const spec = createValidAppSpec()
        spec.workflow.transitions.push({
          from: ['SUBMITTED', 'NEEDS_INFO'],
          to: 'REJECTED',
          allowedRoles: ['STAFF'],
        })
        expect(isValidAppSpec(spec)).toBe(true)
      })
    })

    describe('invalid AppSpec - top level', () => {
      it('should reject null', () => {
        expect(isValidAppSpec(null)).toBe(false)
      })

      it('should reject undefined', () => {
        expect(isValidAppSpec(undefined)).toBe(false)
      })

      it('should reject non-object types', () => {
        expect(isValidAppSpec('string')).toBe(false)
        expect(isValidAppSpec(123)).toBe(false)
        expect(isValidAppSpec(true)).toBe(false)
        expect(isValidAppSpec([])).toBe(false)
      })

      it('should reject empty object', () => {
        expect(isValidAppSpec({})).toBe(false)
      })

      it('should reject AppSpec with missing id', () => {
        const spec = createValidAppSpec()
        delete (spec as any).id
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with wrong version', () => {
        const spec = createValidAppSpec()
        ;(spec as any).version = '0.2'
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid version type', () => {
        const spec = createValidAppSpec()
        ;(spec as any).version = 0.3
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - meta', () => {
      it('should reject AppSpec with missing meta', () => {
        const spec = createValidAppSpec()
        delete (spec as any).meta
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing meta.name', () => {
        const spec = createValidAppSpec()
        delete (spec as any).meta.name
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing meta.slug', () => {
        const spec = createValidAppSpec()
        delete (spec as any).meta.slug
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing meta.description', () => {
        const spec = createValidAppSpec()
        delete (spec as any).meta.description
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing meta.orgId', () => {
        const spec = createValidAppSpec()
        delete (spec as any).meta.orgId
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing meta.orgSlug', () => {
        const spec = createValidAppSpec()
        delete (spec as any).meta.orgSlug
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid meta types', () => {
        const spec = createValidAppSpec()
        ;(spec as any).meta.name = 123
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - theme', () => {
      it('should reject AppSpec with missing theme', () => {
        const spec = createValidAppSpec()
        delete (spec as any).theme
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid theme preset', () => {
        const spec = createValidAppSpec()
        ;(spec as any).theme.preset = 'invalid-preset'
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing theme preset', () => {
        const spec = createValidAppSpec()
        delete (spec as any).theme.preset
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - roles', () => {
      it('should reject AppSpec with missing roles', () => {
        const spec = createValidAppSpec()
        delete (spec as any).roles
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with non-array roles', () => {
        const spec = createValidAppSpec()
        ;(spec as any).roles = {}
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid role id', () => {
        const spec = createValidAppSpec()
        spec.roles[0].id = 'INVALID' as any
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing role authRequired', () => {
        const spec = createValidAppSpec()
        delete (spec as any).roles[0].authRequired
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid authRequired type', () => {
        const spec = createValidAppSpec()
        ;(spec as any).roles[0].authRequired = 'true'
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - pages', () => {
      it('should reject AppSpec with missing pages', () => {
        const spec = createValidAppSpec()
        delete (spec as any).pages
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with non-array pages', () => {
        const spec = createValidAppSpec()
        ;(spec as any).pages = {}
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with page missing id', () => {
        const spec = createValidAppSpec()
        delete (spec as any).pages[0].id
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with page missing route', () => {
        const spec = createValidAppSpec()
        delete (spec as any).pages[0].route
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid page role', () => {
        const spec = createValidAppSpec()
        ;(spec as any).pages[0].role = 'ADMIN'
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid page type', () => {
        const spec = createValidAppSpec()
        ;(spec as any).pages[0].type = 'invalid-type'
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with page missing title', () => {
        const spec = createValidAppSpec()
        delete (spec as any).pages[0].title
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - workflow', () => {
      it('should reject AppSpec with missing workflow', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing workflow.states', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow.states
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with non-array workflow.states', () => {
        const spec = createValidAppSpec()
        ;(spec as any).workflow.states = {}
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid workflow state', () => {
        const spec = createValidAppSpec()
        spec.workflow.states = ['INVALID_STATE'] as any
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing workflow.initialState', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow.initialState
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid workflow.initialState', () => {
        const spec = createValidAppSpec()
        ;(spec as any).workflow.initialState = 'INVALID_STATE'
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing workflow.transitions', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow.transitions
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with non-array workflow.transitions', () => {
        const spec = createValidAppSpec()
        ;(spec as any).workflow.transitions = {}
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with transition missing from', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow.transitions[0].from
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with transition missing to', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow.transitions[0].to
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with transition missing allowedRoles', () => {
        const spec = createValidAppSpec()
        delete (spec as any).workflow.transitions[0].allowedRoles
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - api', () => {
      it('should reject AppSpec with missing api', () => {
        const spec = createValidAppSpec()
        delete (spec as any).api
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with wrong api.baseUrl', () => {
        const spec = createValidAppSpec()
        ;(spec as any).api.baseUrl = 'https://api.example.com'
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing api.endpoints', () => {
        const spec = createValidAppSpec()
        delete (spec as any).api.endpoints
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing api endpoint', () => {
        const spec = createValidAppSpec()
        delete (spec as any).api.endpoints.createSubmission
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid endpoint type', () => {
        const spec = createValidAppSpec()
        ;(spec as any).api.endpoints.createSubmission = 123
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - analytics', () => {
      it('should reject AppSpec with missing analytics', () => {
        const spec = createValidAppSpec()
        delete (spec as any).analytics
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing analytics.events', () => {
        const spec = createValidAppSpec()
        delete (spec as any).analytics.events
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with non-array analytics.events', () => {
        const spec = createValidAppSpec()
        ;(spec as any).analytics.events = {}
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with event missing name', () => {
        const spec = createValidAppSpec()
        delete (spec as any).analytics.events[0].name
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with event missing trigger', () => {
        const spec = createValidAppSpec()
        delete (spec as any).analytics.events[0].trigger
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid event trigger', () => {
        const spec = createValidAppSpec()
        ;(spec as any).analytics.events[0].trigger = 'invalid'
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })

    describe('invalid AppSpec - environments', () => {
      it('should reject AppSpec with missing environments', () => {
        const spec = createValidAppSpec()
        delete (spec as any).environments
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing environments.staging', () => {
        const spec = createValidAppSpec()
        delete (spec as any).environments.staging
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing environments.production', () => {
        const spec = createValidAppSpec()
        delete (spec as any).environments.production
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing staging.domain', () => {
        const spec = createValidAppSpec()
        delete (spec as any).environments.staging.domain
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with missing staging.apiUrl', () => {
        const spec = createValidAppSpec()
        delete (spec as any).environments.staging.apiUrl
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid staging.domain type', () => {
        const spec = createValidAppSpec()
        ;(spec as any).environments.staging.domain = 123
        expect(isValidAppSpec(spec)).toBe(false)
      })

      it('should reject AppSpec with invalid production.apiUrl type', () => {
        const spec = createValidAppSpec()
        ;(spec as any).environments.production.apiUrl = 123
        expect(isValidAppSpec(spec)).toBe(false)
      })
    })
  })

  describe('TypeScript type exports', () => {
    it('should export FastformAppSpec type', () => {
      const spec: FastformAppSpec = createValidAppSpec()
      expect(spec.version).toBe('0.3')
    })

    it('should export AppMeta type', () => {
      const meta: AppMeta = {
        name: 'Test',
        slug: 'test',
        description: 'Test app',
        orgId: 'org-123',
        orgSlug: 'org-test',
      }
      expect(meta.name).toBe('Test')
    })

    it('should export ThemeConfig type', () => {
      const theme: ThemeConfig = {
        preset: 'healthcare-calm',
        logo: 'https://example.com/logo.png',
      }
      expect(theme.preset).toBe('healthcare-calm')
    })

    it('should export Role type', () => {
      const role: Role = {
        id: 'PATIENT',
        authRequired: false,
      }
      expect(role.id).toBe('PATIENT')
    })

    it('should export Page type', () => {
      const page: Page = {
        id: 'welcome',
        route: '/',
        role: 'PATIENT',
        type: 'welcome',
        title: 'Welcome',
      }
      expect(page.type).toBe('welcome')
    })

    it('should export Field type', () => {
      const field: Field = {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
      }
      expect(field.type).toBe('email')
    })

    it('should export WorkflowConfig type', () => {
      const workflow: WorkflowConfig = {
        states: ['DRAFT', 'SUBMITTED'],
        initialState: 'DRAFT',
        transitions: [
          { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
        ],
      }
      expect(workflow.initialState).toBe('DRAFT')
    })

    it('should export ApiConfig type', () => {
      const api: ApiConfig = {
        baseUrl: '{{FASTFORM_API_URL}}',
        endpoints: {
          createSubmission: 'POST /api/apps/:appId/submissions',
          getSubmission: 'GET /api/apps/:appId/submissions/:id',
          resubmitSubmission: 'POST /api/apps/:appId/submissions/:id/resubmit',
          staffLogin: 'POST /api/apps/:appId/staff/login',
          staffLogout: 'POST /api/apps/:appId/staff/logout',
          staffSession: 'GET /api/apps/:appId/staff/session',
          listSubmissions: 'GET /api/apps/:appId/staff/inbox',
          getSubmissionDetail: 'GET /api/apps/:appId/staff/submissions/:id',
          transitionSubmission:
            'POST /api/apps/:appId/staff/submissions/:id/transition',
          trackEvent: 'POST /api/apps/:appId/events',
        },
      }
      expect(api.baseUrl).toBe('{{FASTFORM_API_URL}}')
    })

    it('should export AnalyticsConfig type', () => {
      const analytics: AnalyticsConfig = {
        events: [{ name: 'page_view', trigger: 'pageview' }],
      }
      expect(analytics.events).toHaveLength(1)
    })

    it('should export EnvironmentConfig type', () => {
      const env: EnvironmentConfig = {
        staging: {
          domain: 'app-staging.example.com',
          apiUrl: 'https://api-staging.example.com',
        },
        production: {
          domain: 'app.example.com',
          apiUrl: 'https://api.example.com',
        },
      }
      expect(env.staging.domain).toContain('staging')
    })
  })

  describe('schema version validation', () => {
    it('should only accept version "0.3"', () => {
      const spec = createValidAppSpec()
      expect(isValidAppSpec(spec)).toBe(true)

      const specV02 = { ...spec, version: '0.2' }
      expect(isValidAppSpec(specV02)).toBe(false)

      const specV04 = { ...spec, version: '0.4' }
      expect(isValidAppSpec(specV04)).toBe(false)

      const specV1 = { ...spec, version: '1.0' }
      expect(isValidAppSpec(specV1)).toBe(false)
    })
  })

  describe('real-world Psych Intake Lite example', () => {
    it('should validate the Psych Intake Lite spec from docs', () => {
      const psychIntakeSpec: FastformAppSpec = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        version: '0.3',
        meta: {
          name: 'Psych Intake Lite',
          slug: 'psych-intake',
          description: 'Quick mental health intake for new patients',
          orgId: '123e4567-e89b-12d3-a456-426614174001',
          orgSlug: 'test-org',
        },
        theme: {
          preset: 'healthcare-calm',
          logo: 'https://example.com/logo.png',
        },
        roles: [
          { id: 'PATIENT', authRequired: false },
          { id: 'STAFF', authRequired: true, routePrefix: '/staff' },
        ],
        pages: [
          {
            id: 'start',
            route: '/',
            role: 'PATIENT',
            type: 'welcome',
            title: 'Welcome',
            description: 'Thank you for choosing us for your care.',
            fields: [
              {
                id: 'consent',
                type: 'checkbox',
                label: 'I agree to the terms and privacy policy',
                required: true,
              },
            ],
          },
          {
            id: 'intake',
            route: '/intake',
            role: 'PATIENT',
            type: 'form',
            title: 'Tell Us About Yourself',
            fields: [
              {
                id: 'firstName',
                type: 'text',
                label: 'First Name',
                required: true,
              },
              {
                id: 'lastName',
                type: 'text',
                label: 'Last Name',
                required: true,
              },
              {
                id: 'dob',
                type: 'date',
                label: 'Date of Birth',
                required: true,
              },
              { id: 'email', type: 'email', label: 'Email', required: true },
              { id: 'phone', type: 'tel', label: 'Phone', required: true },
              {
                id: 'state',
                type: 'select',
                label: 'State of Residence',
                required: true,
                options: [
                  { value: 'CA', label: 'California' },
                  { value: 'NY', label: 'New York' },
                  { value: 'TX', label: 'Texas' },
                  { value: 'FL', label: 'Florida' },
                  { value: 'OTHER', label: 'Other' },
                ],
              },
              {
                id: 'seekingHelp',
                type: 'textarea',
                label: 'What brings you to seek help today?',
                required: true,
              },
              {
                id: 'previousTherapy',
                type: 'radio',
                label: 'Have you seen a therapist before?',
                required: true,
                options: [
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ],
              },
              {
                id: 'currentMedications',
                type: 'textarea',
                label: 'List any current medications',
                required: false,
              },
              {
                id: 'emergencyContact',
                type: 'text',
                label: 'Emergency Contact Name & Phone',
                required: true,
              },
            ],
          },
          {
            id: 'review',
            route: '/review',
            role: 'PATIENT',
            type: 'review',
            title: 'Review Your Information',
            description: 'Please confirm everything looks correct.',
          },
          {
            id: 'submitted',
            route: '/submitted',
            role: 'PATIENT',
            type: 'success',
            title: 'Thank You!',
            description:
              "We've received your intake. Our team will review and reach out within 24-48 hours.",
          },
          {
            id: 'staff-login',
            route: '/staff/login',
            role: 'STAFF',
            type: 'login',
            title: 'Staff Login',
          },
          {
            id: 'staff-inbox',
            route: '/staff/inbox',
            role: 'STAFF',
            type: 'list',
            title: 'Intake Inbox',
            description: 'Review and process patient submissions',
          },
          {
            id: 'staff-detail',
            route: '/staff/submission/[id]',
            role: 'STAFF',
            type: 'detail',
            title: 'Submission Details',
            actions: [
              {
                id: 'approve',
                label: 'Approve',
                targetState: 'APPROVED',
                variant: 'primary',
              },
              {
                id: 'request-info',
                label: 'Request More Info',
                targetState: 'NEEDS_INFO',
                requiresNote: true,
                variant: 'secondary',
              },
              {
                id: 'reject',
                label: 'Reject',
                targetState: 'REJECTED',
                requiresNote: true,
                variant: 'danger',
              },
            ],
          },
        ],
        workflow: {
          states: ['DRAFT', 'SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'REJECTED'],
          initialState: 'DRAFT',
          transitions: [
            { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
            { from: 'SUBMITTED', to: 'APPROVED', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'NEEDS_INFO', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'REJECTED', allowedRoles: ['STAFF'] },
            { from: 'NEEDS_INFO', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
            { from: 'NEEDS_INFO', to: 'REJECTED', allowedRoles: ['STAFF'] },
          ],
        },
        api: {
          baseUrl: '{{FASTFORM_API_URL}}',
          endpoints: {
            createSubmission: 'POST /api/apps/:appId/submissions',
            getSubmission: 'GET /api/apps/:appId/submissions/:id',
            resubmitSubmission: 'POST /api/apps/:appId/submissions/:id/resubmit',
            staffLogin: 'POST /api/apps/:appId/staff/login',
            staffLogout: 'POST /api/apps/:appId/staff/logout',
            staffSession: 'GET /api/apps/:appId/staff/session',
            listSubmissions: 'GET /api/apps/:appId/staff/inbox',
            getSubmissionDetail: 'GET /api/apps/:appId/staff/submissions/:id',
            transitionSubmission:
              'POST /api/apps/:appId/staff/submissions/:id/transition',
            trackEvent: 'POST /api/apps/:appId/events',
          },
        },
        analytics: {
          events: [
            { name: 'intake_started', trigger: 'pageview', page: '/' },
            { name: 'intake_form_viewed', trigger: 'pageview', page: '/intake' },
            { name: 'intake_reviewed', trigger: 'pageview', page: '/review' },
            { name: 'intake_submitted', trigger: 'submit', page: '/review' },
            {
              name: 'intake_resumed',
              trigger: 'pageview',
              page: '/resume/[id]',
            },
            {
              name: 'intake_resume_reviewed',
              trigger: 'pageview',
              page: '/resume/[id]/review',
            },
            {
              name: 'intake_resubmitted',
              trigger: 'submit',
              page: '/resume/[id]/review',
            },
            {
              name: 'staff_inbox_viewed',
              trigger: 'pageview',
              page: '/staff/inbox',
            },
            {
              name: 'staff_submission_viewed',
              trigger: 'pageview',
              page: '/staff/submission/[id]',
            },
            { name: 'submission_transitioned', trigger: 'transition' },
          ],
        },
        environments: {
          staging: {
            domain: 'psych-intake-test-org-staging.getfastform.com',
            apiUrl: 'https://api-staging.getfastform.com',
          },
          production: {
            domain: 'psych-intake-test-org.getfastform.com',
            apiUrl: 'https://api.getfastform.com',
          },
        },
      }

      expect(isValidAppSpec(psychIntakeSpec)).toBe(true)
    })
  })
})
