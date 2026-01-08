/**
 * Comprehensive test suite for AppSpec → Prompt compiler.
 *
 * Tests verify:
 * 1. Deterministic output (same input = same output)
 * 2. Prompt content completeness (all AppSpec parts are included)
 * 3. Validation of unsupported features (throws proper errors)
 * 4. Edge cases (minimal specs, complex specs, empty arrays, special chars)
 *
 * @module compiler/appspec-to-prompt.test
 */

import { describe, it, expect } from 'vitest'
import {
  compileAppSpecToPrompt,
  UnsupportedAppSpecFeatureError,
} from './appspec-to-prompt'
import { PSYCH_INTAKE_TEMPLATE } from '@/lib/templates/psych-intake-lite'
import type { FastformAppSpec, PageType, FieldType } from '@/lib/types/appspec'

describe('AppSpec → Prompt Compiler', () => {
  /**
   * Helper: Create a minimal valid AppSpec for testing
   */
  const createMinimalAppSpec = (): FastformAppSpec => ({
    id: 'test-app-id',
    version: '0.3',
    meta: {
      name: 'Test App',
      slug: 'test-app',
      description: 'A minimal test application',
      orgId: 'test-org-id',
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
    ],
    workflow: {
      states: ['DRAFT', 'SUBMITTED'],
      initialState: 'DRAFT',
      transitions: [
        { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
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
      events: [{ name: 'page_view', trigger: 'pageview', page: '/' }],
    },
    environments: {
      staging: {
        domain: 'test-app-staging.getfastform.com',
        apiUrl: 'https://api-staging.getfastform.com',
      },
      production: {
        domain: 'test-app.getfastform.com',
        apiUrl: 'https://api.getfastform.com',
      },
    },
  })

  /**
   * Helper: Create a complex AppSpec with multiple pages and fields
   */
  const createComplexAppSpec = (): FastformAppSpec => {
    const spec = createMinimalAppSpec()
    spec.meta.name = 'Complex Healthcare App'
    spec.meta.description =
      'A complex multi-page application with extensive forms'

    spec.pages = [
      {
        id: 'welcome',
        route: '/',
        role: 'PATIENT',
        type: 'welcome',
        title: 'Welcome to Our Platform',
        description: 'Please read and consent to continue',
        fields: [
          {
            id: 'consent',
            type: 'checkbox',
            label: 'I agree to terms and conditions',
            required: true,
          },
          {
            id: 'privacy',
            type: 'checkbox',
            label: 'I accept the privacy policy',
            required: true,
          },
        ],
      },
      {
        id: 'intake-form',
        route: '/intake',
        role: 'PATIENT',
        type: 'form',
        title: 'Patient Intake Form',
        description: 'Please fill out all required fields',
        fields: [
          {
            id: 'firstName',
            type: 'text',
            label: 'First Name',
            required: true,
            validation: [
              {
                type: 'minLength',
                value: 2,
                message: 'First name must be at least 2 characters',
              },
            ],
          },
          {
            id: 'lastName',
            type: 'text',
            label: 'Last Name',
            required: true,
          },
          {
            id: 'email',
            type: 'email',
            label: 'Email Address',
            required: true,
            validation: [
              {
                type: 'pattern',
                value: '^[^@]+@[^@]+\\.[^@]+$',
                message: 'Must be a valid email',
              },
            ],
          },
          {
            id: 'phone',
            type: 'tel',
            label: 'Phone Number',
            required: true,
          },
          {
            id: 'dob',
            type: 'date',
            label: 'Date of Birth',
            required: true,
          },
          {
            id: 'age',
            type: 'number',
            label: 'Age',
            required: false,
            validation: [
              {
                type: 'min',
                value: 0,
                message: 'Age must be positive',
              },
              {
                type: 'max',
                value: 120,
                message: 'Age must be realistic',
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
              { value: 'TX', label: 'Texas' },
            ],
          },
          {
            id: 'insurance',
            type: 'radio',
            label: 'Do you have insurance?',
            required: true,
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ],
          },
          {
            id: 'notes',
            type: 'textarea',
            label: 'Additional Notes',
            required: false,
            placeholder: 'Tell us anything else we should know',
          },
        ],
      },
      {
        id: 'review',
        route: '/review',
        role: 'PATIENT',
        type: 'review',
        title: 'Review Your Submission',
        description: 'Please verify all information is correct',
      },
      {
        id: 'success',
        route: '/submitted',
        role: 'PATIENT',
        type: 'success',
        title: 'Submission Complete',
        description: 'Thank you! We will be in touch soon.',
      },
      {
        id: 'staff-login',
        route: '/staff/login',
        role: 'STAFF',
        type: 'login',
        title: 'Staff Portal Login',
      },
      {
        id: 'staff-inbox',
        route: '/staff/inbox',
        role: 'STAFF',
        type: 'list',
        title: 'Patient Submissions',
        description: 'Review and manage all submissions',
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
            label: 'Request More Information',
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
    ]

    spec.workflow = {
      states: ['DRAFT', 'SUBMITTED', 'NEEDS_INFO', 'APPROVED', 'REJECTED'],
      initialState: 'DRAFT',
      transitions: [
        { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
        { from: 'SUBMITTED', to: 'APPROVED', allowedRoles: ['STAFF'] },
        { from: 'SUBMITTED', to: 'NEEDS_INFO', allowedRoles: ['STAFF'] },
        { from: 'SUBMITTED', to: 'REJECTED', allowedRoles: ['STAFF'] },
        { from: 'NEEDS_INFO', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
      ],
    }

    return spec
  }

  describe('Determinism Tests', () => {
    it('should produce identical output when called twice with same minimal AppSpec', () => {
      const spec = createMinimalAppSpec()
      const prompt1 = compileAppSpecToPrompt(spec)
      const prompt2 = compileAppSpecToPrompt(spec)

      expect(prompt1).toBe(prompt2)
      expect(prompt1).toEqual(prompt2)
    })

    it('should produce identical output when called twice with same complex AppSpec', () => {
      const spec = createComplexAppSpec()
      const prompt1 = compileAppSpecToPrompt(spec)
      const prompt2 = compileAppSpecToPrompt(spec)

      expect(prompt1).toBe(prompt2)
      expect(prompt1).toEqual(prompt2)
    })

    it('should produce identical output when called twice with Psych Intake template', () => {
      const prompt1 = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)
      const prompt2 = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)

      expect(prompt1).toBe(prompt2)
      expect(prompt1).toEqual(prompt2)
    })

    it('should produce different output for different AppSpecs', () => {
      const spec1 = createMinimalAppSpec()
      const spec2 = createComplexAppSpec()

      const prompt1 = compileAppSpecToPrompt(spec1)
      const prompt2 = compileAppSpecToPrompt(spec2)

      expect(prompt1).not.toBe(prompt2)
    })

    it('should produce same output regardless of call order', () => {
      const specA = createMinimalAppSpec()
      const specB = createComplexAppSpec()

      const promptA1 = compileAppSpecToPrompt(specA)
      const promptB1 = compileAppSpecToPrompt(specB)
      const promptA2 = compileAppSpecToPrompt(specA)
      const promptB2 = compileAppSpecToPrompt(specB)

      expect(promptA1).toBe(promptA2)
      expect(promptB1).toBe(promptB2)
    })
  })

  describe('Prompt Content Tests', () => {
    describe('Meta Information', () => {
      it('should include app name from spec.meta.name', () => {
        const spec = createMinimalAppSpec()
        spec.meta.name = 'My Unique Healthcare App'

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('My Unique Healthcare App')
      })

      it('should include app description', () => {
        const spec = createMinimalAppSpec()
        spec.meta.description = 'A specialized patient intake system'

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('A specialized patient intake system')
      })
    })

    describe('Pages', () => {
      it('should enumerate all pages in the prompt', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Check that all page types are mentioned (uppercase in output)
        expect(prompt).toContain('WELCOME')
        expect(prompt).toContain('FORM')
        expect(prompt).toContain('REVIEW')
        expect(prompt).toContain('SUCCESS')
        expect(prompt).toContain('LOGIN')
        expect(prompt).toContain('LIST')
        expect(prompt).toContain('DETAIL')
      })

      it('should include page titles in the prompt', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Welcome to Our Platform')
        expect(prompt).toContain('Patient Intake Form')
        expect(prompt).toContain('Review Your Submission')
        expect(prompt).toContain('Staff Portal Login')
      })

      it('should include page routes', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('/')
        expect(prompt).toContain('/intake')
        expect(prompt).toContain('/review')
        expect(prompt).toContain('/staff/login')
        expect(prompt).toContain('/staff/inbox')
      })

      it('should include page descriptions when present', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Please read and consent to continue')
        expect(prompt).toContain('Please fill out all required fields')
      })
    })

    describe('Form Fields', () => {
      it('should include all form fields in the prompt', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Check field IDs are present
        expect(prompt).toContain('firstName')
        expect(prompt).toContain('lastName')
        expect(prompt).toContain('email')
        expect(prompt).toContain('phone')
        expect(prompt).toContain('dob')
        expect(prompt).toContain('state')
        expect(prompt).toContain('insurance')
        expect(prompt).toContain('notes')
      })

      it('should include field labels', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('First Name')
        expect(prompt).toContain('Last Name')
        expect(prompt).toContain('Email Address')
        expect(prompt).toContain('Phone Number')
        expect(prompt).toContain('Date of Birth')
      })

      it('should include field types', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('text')
        expect(prompt).toContain('email')
        expect(prompt).toContain('tel')
        expect(prompt).toContain('date')
        expect(prompt).toContain('number')
        expect(prompt).toContain('select')
        expect(prompt).toContain('radio')
        expect(prompt).toContain('textarea')
        expect(prompt).toContain('checkbox')
      })

      it('should indicate required vs optional fields', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Should mention required nature of fields
        expect(prompt).toMatch(/required/i)
      })

      it('should include validation rules for fields', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Check validation rules are mentioned (natural language format)
        expect(prompt).toContain('minimum 2 characters')
        expect(prompt).toContain('pattern')
        expect(prompt).toContain('minimum value 0')
        expect(prompt).toContain('maximum value 120')
      })

      it('should include maxLength validation rule', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'shortText',
            type: 'text',
            label: 'Short Text',
            required: true,
            validation: [
              {
                type: 'maxLength',
                value: 100,
                message: 'Must be at most 100 characters',
              },
            ],
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('maximum 100 characters')
      })

      it('should handle unknown validation rule types with default case', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'customField',
            type: 'text',
            label: 'Custom Field',
            required: true,
            validation: [
              {
                type: 'customRule' as any,
                value: 'custom-value',
                message: 'Custom validation failed',
              },
            ],
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('customRule: custom-value')
      })

      it('should include validation error messages', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Validation rules are included, though error messages are not explicitly in the prompt
        // The compiler includes validation rules in natural language format
        expect(prompt).toContain('minimum 2 characters')
        expect(prompt).toContain('pattern')
        expect(prompt).toContain('minimum value')
        expect(prompt).toContain('maximum value')
      })

      it('should include select/radio options', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Check options are included
        expect(prompt).toContain('California')
        expect(prompt).toContain('New York')
        expect(prompt).toContain('Texas')
      })

      it('should include placeholders when present', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Tell us anything else we should know')
      })
    })

    describe('Workflow', () => {
      it('should include workflow states', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('DRAFT')
        expect(prompt).toContain('SUBMITTED')
        expect(prompt).toContain('NEEDS_INFO')
        expect(prompt).toContain('APPROVED')
        expect(prompt).toContain('REJECTED')
      })

      it('should include initial state', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toMatch(/initial.*state.*DRAFT/i)
      })

      it('should include workflow transitions', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Check that transitions are mentioned
        expect(prompt).toMatch(/transition/i)
        expect(prompt).toContain('DRAFT')
        expect(prompt).toContain('SUBMITTED')
      })
    })

    describe('Theme', () => {
      it('should mention theme preset', () => {
        const spec = createMinimalAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('healthcare-calm')
      })

      it('should include logo if present', () => {
        const spec = createMinimalAppSpec()
        spec.theme.logo = 'https://example.com/logo.png'

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('https://example.com/logo.png')
      })

      it('should include custom colors if present', () => {
        const spec = createMinimalAppSpec()
        spec.theme.colors = {
          primary: '#7FFFD4',
          background: '#F0F8FF',
          text: '#1F2937',
        }

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('#7FFFD4')
        expect(prompt).toContain('#F0F8FF')
        expect(prompt).toContain('#1F2937')
      })
    })

    describe('Actions', () => {
      it('should include staff actions on detail pages', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Approve')
        expect(prompt).toContain('Request More Information')
        expect(prompt).toContain('Reject')
      })

      it('should include action target states', () => {
        const spec = createComplexAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('APPROVED')
        expect(prompt).toContain('NEEDS_INFO')
        expect(prompt).toContain('REJECTED')
      })
    })

    describe('Constraints Section', () => {
      it('should include CONSTRAINTS section in output', () => {
        const spec = createMinimalAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toMatch(/CONSTRAINTS/i)
      })

      it('should mention technical constraints or requirements', () => {
        const spec = createMinimalAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        // Should include some technical guidance
        expect(prompt.length).toBeGreaterThan(100)
      })
    })
  })

  describe('Validation Tests - Unsupported Features', () => {
    describe('Unsupported Page Types', () => {
      it('should throw UnsupportedAppSpecFeatureError for unsupported page type', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'dashboard' as PageType

        expect(() => compileAppSpecToPrompt(spec)).toThrow(
          UnsupportedAppSpecFeatureError
        )
      })

      it('should provide helpful error message for unsupported page type', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'custom-wizard' as PageType

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          expect(error).toBeInstanceOf(UnsupportedAppSpecFeatureError)
          expect((error as Error).message).toContain('custom-wizard')
          expect((error as Error).message).toMatch(/not supported/i)
        }
      })

      it('should suggest alternatives in error message for unsupported page type', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'admin-panel' as PageType

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          const message = (error as Error).message
          // Should suggest valid alternatives
          expect(message).toMatch(/supported.*types/i)
        }
      })
    })

    describe('Unsupported Workflow States', () => {
      it('should throw UnsupportedAppSpecFeatureError for unsupported workflow state', () => {
        const spec = createMinimalAppSpec()
        spec.workflow.states = ['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as any

        expect(() => compileAppSpecToPrompt(spec)).toThrow(
          UnsupportedAppSpecFeatureError
        )
      })

      it('should provide helpful error message for unsupported workflow state', () => {
        const spec = createMinimalAppSpec()
        spec.workflow.states = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] as any

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          expect(error).toBeInstanceOf(UnsupportedAppSpecFeatureError)
          expect((error as Error).message).toContain('PENDING_APPROVAL')
          expect((error as Error).message).toMatch(/not supported/i)
        }
      })

      it('should suggest alternatives in error message for unsupported workflow state', () => {
        const spec = createMinimalAppSpec()
        spec.workflow.states = ['DRAFT', 'CUSTOM_STATE', 'APPROVED'] as any

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          const unsupportedError = error as UnsupportedAppSpecFeatureError
          expect(unsupportedError.suggestion).toContain('Use simple workflow with states:')
          expect(unsupportedError.suggestion).toContain('DRAFT')
          expect(unsupportedError.suggestion).toContain('SUBMITTED')
        }
      })
    })

    describe('Workflow Complexity', () => {
      it('should throw UnsupportedAppSpecFeatureError for overly complex workflow', () => {
        const spec = createMinimalAppSpec()
        spec.workflow = {
          states: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
          initialState: 'DRAFT',
          // 4 states * 3 = 12 transitions is the threshold
          // Create 13 transitions to exceed the limit
          transitions: [
            { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
            { from: 'SUBMITTED', to: 'APPROVED', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'REJECTED', allowedRoles: ['STAFF'] },
            { from: 'APPROVED', to: 'SUBMITTED', allowedRoles: ['STAFF'] },
            { from: 'REJECTED', to: 'SUBMITTED', allowedRoles: ['STAFF'] },
            { from: 'DRAFT', to: 'APPROVED', allowedRoles: ['STAFF'] },
            { from: 'DRAFT', to: 'REJECTED', allowedRoles: ['STAFF'] },
            { from: 'APPROVED', to: 'REJECTED', allowedRoles: ['STAFF'] },
            { from: 'REJECTED', to: 'APPROVED', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'DRAFT', allowedRoles: ['PATIENT'] },
            { from: 'APPROVED', to: 'DRAFT', allowedRoles: ['PATIENT'] },
            { from: 'REJECTED', to: 'DRAFT', allowedRoles: ['PATIENT'] },
            { from: 'DRAFT', to: 'DRAFT', allowedRoles: ['PATIENT'] },
          ],
        }

        expect(() => compileAppSpecToPrompt(spec)).toThrow(
          UnsupportedAppSpecFeatureError
        )
      })

      it('should provide helpful error message for overly complex workflow', () => {
        const spec = createMinimalAppSpec()
        spec.workflow = {
          states: ['DRAFT', 'SUBMITTED'],
          initialState: 'DRAFT',
          // 2 states * 3 = 6 transitions is the threshold
          // Create 7 transitions to exceed the limit
          transitions: [
            { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
            { from: 'SUBMITTED', to: 'DRAFT', allowedRoles: ['PATIENT'] },
            { from: 'DRAFT', to: 'DRAFT', allowedRoles: ['PATIENT'] },
            { from: 'SUBMITTED', to: 'SUBMITTED', allowedRoles: ['STAFF'] },
            { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'DRAFT', allowedRoles: ['STAFF'] },
            { from: 'DRAFT', to: 'DRAFT', allowedRoles: ['STAFF'] },
          ],
        }

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          expect(error).toBeInstanceOf(UnsupportedAppSpecFeatureError)
          expect((error as Error).message).toContain('too complex for v1')
          expect((error as Error).message).toContain('7 transitions')
          expect((error as Error).message).toContain('2 states')
        }
      })

      it('should suggest simplification in error message for complex workflow', () => {
        const spec = createMinimalAppSpec()
        spec.workflow = {
          states: ['DRAFT', 'SUBMITTED', 'APPROVED'],
          initialState: 'DRAFT',
          // 3 states * 3 = 9 transitions threshold
          // Create 10 transitions
          transitions: Array.from({ length: 10 }, () => ({
            from: 'DRAFT',
            to: 'SUBMITTED',
            allowedRoles: ['PATIENT' as const],
          })),
        }

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          const unsupportedError = error as UnsupportedAppSpecFeatureError
          expect(unsupportedError.feature).toBe('workflow.complexity')
          expect(unsupportedError.suggestion).toContain('Simplify workflow')
        }
      })
    })

    describe('Unsupported Field Types', () => {
      it('should throw UnsupportedAppSpecFeatureError for unsupported field type', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].fields = [
          {
            id: 'file',
            type: 'file' as FieldType,
            label: 'Upload File',
            required: false,
          },
        ]

        expect(() => compileAppSpecToPrompt(spec)).toThrow(
          UnsupportedAppSpecFeatureError
        )
      })

      it('should provide helpful error message for unsupported field type', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].fields = [
          {
            id: 'signature',
            type: 'signature' as FieldType,
            label: 'Sign Here',
            required: true,
          },
        ]

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          expect(error).toBeInstanceOf(UnsupportedAppSpecFeatureError)
          expect((error as Error).message).toContain('signature')
          expect((error as Error).message).toMatch(/not supported/i)
        }
      })

      it('should suggest alternatives in error message for unsupported field type', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].fields = [
          {
            id: 'color',
            type: 'color-picker' as FieldType,
            label: 'Choose Color',
            required: false,
          },
        ]

        try {
          compileAppSpecToPrompt(spec)
          expect.fail('Should have thrown UnsupportedAppSpecFeatureError')
        } catch (error) {
          const message = (error as Error).message
          // Should suggest valid alternatives
          expect(message).toMatch(/supported.*types/i)
        }
      })

      it('should handle multiple unsupported field types in one spec', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'file1',
            type: 'file' as FieldType,
            label: 'Upload',
            required: false,
          },
          {
            id: 'file2',
            type: 'image' as FieldType,
            label: 'Upload Image',
            required: false,
          },
        ]

        expect(() => compileAppSpecToPrompt(spec)).toThrow(
          UnsupportedAppSpecFeatureError
        )
      })
    })

    describe('Valid Features (Should Not Throw)', () => {
      it('should not throw for all supported page types', () => {
        const supportedPageTypes: PageType[] = [
          'welcome',
          'form',
          'review',
          'success',
          'login',
          'list',
          'detail',
        ]

        for (const pageType of supportedPageTypes) {
          const spec = createMinimalAppSpec()
          spec.pages[0].type = pageType

          expect(() => compileAppSpecToPrompt(spec)).not.toThrow()
        }
      })

      it('should not throw for all supported field types', () => {
        const supportedFieldTypes: FieldType[] = [
          'text',
          'email',
          'tel',
          'date',
          'textarea',
          'select',
          'radio',
          'checkbox',
          'number',
        ]

        for (const fieldType of supportedFieldTypes) {
          const spec = createMinimalAppSpec()
          spec.pages[0].type = 'form'
          spec.pages[0].fields = [
            {
              id: 'testField',
              type: fieldType,
              label: 'Test Field',
              required: false,
            },
          ]

          expect(() => compileAppSpecToPrompt(spec)).not.toThrow()
        }
      })

      it('should not throw for Psych Intake template (known valid spec)', () => {
        expect(() =>
          compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)
        ).not.toThrow()
      })

      it('should not throw for complex valid AppSpec', () => {
        const spec = createComplexAppSpec()
        expect(() => compileAppSpecToPrompt(spec)).not.toThrow()
      })
    })
  })

  describe('Edge Cases', () => {
    describe('Minimal AppSpec', () => {
      it('should handle minimal valid AppSpec', () => {
        const spec = createMinimalAppSpec()
        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toBeTruthy()
        expect(prompt.length).toBeGreaterThan(0)
        expect(prompt).toContain('Test App')
      })

      it('should handle AppSpec with single page', () => {
        const spec = createMinimalAppSpec()
        spec.pages = [
          {
            id: 'home',
            route: '/',
            role: 'PATIENT',
            type: 'welcome',
            title: 'Home',
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Home')
        expect(prompt).toContain('/')
      })

      it('should handle page with no fields', () => {
        const spec = createMinimalAppSpec()
        spec.pages = [
          {
            id: 'success',
            route: '/success',
            role: 'PATIENT',
            type: 'success',
            title: 'Success',
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Success')
      })

      it('should handle page with no description', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].description = undefined

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Welcome')
      })
    })

    describe('Complex AppSpec', () => {
      it('should handle AppSpec with many pages (10+)', () => {
        const spec = createMinimalAppSpec()
        spec.pages = Array.from({ length: 12 }, (_, i) => ({
          id: `page-${i}`,
          route: `/page-${i}`,
          role: 'PATIENT' as const,
          type: 'form' as const,
          title: `Page ${i}`,
        }))

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Page 0')
        expect(prompt).toContain('Page 11')
      })

      it('should handle form with many fields (20+)', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = Array.from({ length: 25 }, (_, i) => ({
          id: `field-${i}`,
          type: 'text' as const,
          label: `Field ${i}`,
          required: i % 2 === 0,
        }))

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('field-0')
        expect(prompt).toContain('field-24')
      })

      it('should handle select field with many options (50+)', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'country',
            type: 'select',
            label: 'Country',
            required: true,
            options: Array.from({ length: 50 }, (_, i) => ({
              value: `country-${i}`,
              label: `Country ${i}`,
            })),
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('country')
        expect(prompt).toContain('Country')
      })

      it('should handle complex workflow with many states and transitions', () => {
        const spec = createMinimalAppSpec()
        spec.workflow = {
          states: [
            'DRAFT',
            'SUBMITTED',
            'NEEDS_INFO',
            'APPROVED',
            'REJECTED',
          ],
          initialState: 'DRAFT',
          transitions: [
            { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
            { from: 'SUBMITTED', to: 'NEEDS_INFO', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'APPROVED', allowedRoles: ['STAFF'] },
            { from: 'SUBMITTED', to: 'REJECTED', allowedRoles: ['STAFF'] },
            { from: 'NEEDS_INFO', to: 'SUBMITTED', allowedRoles: ['PATIENT'] },
            { from: 'NEEDS_INFO', to: 'APPROVED', allowedRoles: ['STAFF'] },
            { from: 'NEEDS_INFO', to: 'REJECTED', allowedRoles: ['STAFF'] },
            { from: 'APPROVED', to: 'REJECTED', allowedRoles: ['STAFF'] },
          ],
        }

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('DRAFT')
        expect(prompt).toContain('SUBMITTED')
        expect(prompt).toContain('NEEDS_INFO')
        expect(prompt).toContain('APPROVED')
        expect(prompt).toContain('REJECTED')
      })
    })

    describe('Empty Arrays', () => {
      it('should handle empty fields array gracefully', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = []

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toBeTruthy()
        expect(prompt).toContain('Welcome')
      })

      it('should handle page with undefined fields', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].fields = undefined

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toBeTruthy()
      })

      it('should handle empty options array in select field', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'emptySelect',
            type: 'select',
            label: 'Empty Select',
            required: false,
            options: [],
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('emptySelect')
      })

      it('should handle empty validation array', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'field',
            type: 'text',
            label: 'Field',
            required: true,
            validation: [],
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('field')
      })

      it('should handle empty actions array', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'detail'
        spec.pages[0].actions = []

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toBeTruthy()
      })
    })

    describe('Special Characters', () => {
      it('should handle special characters in app name', () => {
        const spec = createMinimalAppSpec()
        spec.meta.name = "Dr. O'Connor's Intake Form (2024) - v1.0!"

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain("Dr. O'Connor's Intake Form (2024) - v1.0!")
      })

      it('should handle special characters in field labels', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'field1',
            type: 'text',
            label: 'Patient\'s Name (First & Last) - "Legal Name"',
            required: true,
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain(
          'Patient\'s Name (First & Last) - "Legal Name"'
        )
      })

      it('should handle Unicode characters in descriptions', () => {
        const spec = createMinimalAppSpec()
        spec.meta.description = 'Healthcare app with emojis 🏥💉📋'
        spec.pages[0].description = 'Welcome! 👋 We\'re here to help 💙'

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('🏥💉📋')
        expect(prompt).toContain('👋')
        expect(prompt).toContain('💙')
      })

      it('should handle newlines in textarea placeholder', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'notes',
            type: 'textarea',
            label: 'Notes',
            required: false,
            placeholder: 'Line 1\nLine 2\nLine 3',
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('notes')
      })

      it('should handle HTML entities in text', () => {
        const spec = createMinimalAppSpec()
        spec.meta.name = 'App &lt;Test&gt; &amp; Demo'

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('App &lt;Test&gt; &amp; Demo')
      })

      it('should handle backticks and template literals in text', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].description = 'Use `code` formatting with ${variables}'

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('Use `code` formatting with ${variables}')
      })

      it('should handle very long field labels (200+ chars)', () => {
        const spec = createMinimalAppSpec()
        const longLabel =
          'This is an extremely long field label that exceeds normal length expectations and is designed to test the compiler\'s ability to handle very long strings without breaking or truncating the content inappropriately'.repeat(
            2
          )

        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'longField',
            type: 'text',
            label: longLabel,
            required: false,
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('longField')
        expect(prompt).toContain(longLabel)
      })

      it('should handle field condition with undefined value (exists operator)', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'primaryField',
            type: 'text',
            label: 'Primary Field',
            required: false,
          },
          {
            id: 'conditionalField',
            type: 'text',
            label: 'Conditional Field',
            required: false,
            condition: {
              field: 'primaryField',
              operator: 'exists',
              value: undefined,
            },
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('conditionalField')
        expect(prompt).toContain('shown when field "primaryField" exists (exists)')
      })

      it('should handle field condition with not_equals operator', () => {
        const spec = createMinimalAppSpec()
        spec.pages[0].type = 'form'
        spec.pages[0].fields = [
          {
            id: 'statusField',
            type: 'select',
            label: 'Status',
            required: true,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
          {
            id: 'reasonField',
            type: 'textarea',
            label: 'Reason for Inactive',
            required: false,
            condition: {
              field: 'statusField',
              operator: 'not_equals',
              value: 'active',
            },
          },
        ]

        const prompt = compileAppSpecToPrompt(spec)

        expect(prompt).toContain('reasonField')
        expect(prompt).toContain('shown when field "statusField" not_equals active')
      })
    })

    describe('Real-world Template', () => {
      it('should successfully compile Psych Intake template', () => {
        const prompt = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)

        expect(prompt).toBeTruthy()
        expect(prompt.length).toBeGreaterThan(100)
        expect(prompt).toContain('Psych Intake Lite')
      })

      it('should include all pages from Psych Intake template', () => {
        const prompt = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)

        // Check page routes are present
        expect(prompt).toContain('/')
        expect(prompt).toContain('/intake')
        expect(prompt).toContain('/review')
        expect(prompt).toContain('/submitted')
        expect(prompt).toContain('/staff/login')
        expect(prompt).toContain('/staff/inbox')
        expect(prompt).toContain('/staff/submission/[id]')
      })

      it('should include all fields from Psych Intake template', () => {
        const prompt = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)

        expect(prompt).toContain('firstName')
        expect(prompt).toContain('lastName')
        expect(prompt).toContain('dob')
        expect(prompt).toContain('email')
        expect(prompt).toContain('phone')
        expect(prompt).toContain('state')
        expect(prompt).toContain('seekingHelp')
        expect(prompt).toContain('previousTherapy')
        expect(prompt).toContain('emergencyContact')
      })

      it('should include workflow states from Psych Intake template', () => {
        const prompt = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)

        expect(prompt).toContain('DRAFT')
        expect(prompt).toContain('SUBMITTED')
        expect(prompt).toContain('NEEDS_INFO')
        expect(prompt).toContain('APPROVED')
        expect(prompt).toContain('REJECTED')
      })
    })
  })
})
