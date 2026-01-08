/**
 * Post-Processor Usage Example
 *
 * Demonstrates how to use the post-processor to inject invariant files
 * into v0-generated code.
 */

import { injectInvariants, extractFiles, validateInjectedFiles } from './post-processor'
import type { FastformAppSpec } from '../types/appspec'

/**
 * Example: Injecting invariants into v0 code
 */
async function exampleBasicInjection() {
  // Mock v0 generated code (in reality, this comes from v0 SDK)
  const v0GeneratedCode = `
// app/page.tsx
export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Welcome to FastForm</h1>
    </div>
  )
}
`

  // Mock AppSpec (in reality, this comes from LLM generation)
  const appSpec: FastformAppSpec = {
    id: 'app-abc123',
    version: '0.3',
    meta: {
      name: 'Psych Intake',
      slug: 'psych-intake',
      description: 'Patient intake form',
      orgId: 'org-xyz789',
      orgSlug: 'mental-health-clinic',
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
        {
          from: 'SUBMITTED',
          to: 'APPROVED',
          allowedRoles: ['STAFF'],
        },
        {
          from: 'SUBMITTED',
          to: 'REJECTED',
          allowedRoles: ['STAFF'],
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
        {
          name: 'form_submitted',
          trigger: 'submit',
        },
      ],
    },
    environments: {
      staging: {
        domain: '{{ORG_SLUG}}-{{APP_SLUG}}-staging.fastform.app',
        apiUrl: 'https://api-staging.fastform.app',
      },
      production: {
        domain: '{{ORG_SLUG}}-{{APP_SLUG}}.fastform.app',
        apiUrl: 'https://api.fastform.app',
      },
    },
  }

  // Inject invariants
  console.log('Injecting invariants...')
  const result = await injectInvariants(v0GeneratedCode, appSpec)

  console.log('Injected files:', result.injectedFiles)
  console.log('Original code length:', result.original.length)
  console.log('Modified code length:', result.modified.length)

  return result
}

/**
 * Example: Extracting files for deployment
 */
async function exampleFileExtraction() {
  const v0Code = '// v0 generated code'
  const appSpec: FastformAppSpec = {} as FastformAppSpec // Mock spec

  // Inject invariants
  const result = await injectInvariants(v0Code, appSpec)

  // Extract individual files
  const files = extractFiles(result)

  console.log('\nExtracted files:')
  for (const [path, content] of Object.entries(files)) {
    console.log(`- ${path} (${content.length} bytes)`)
  }

  // Validate all required files are present
  const isValid = validateInjectedFiles(files)
  console.log(`\nValidation: ${isValid ? 'PASS' : 'FAIL'}`)

  return files
}

/**
 * Example: Complete deployment workflow
 */
async function exampleDeploymentWorkflow() {
  console.log('=== Complete Deployment Workflow ===\n')

  // Step 1: Get v0 generated code (from v0 SDK)
  const v0Code = '// v0 generated code'

  // Step 2: Get AppSpec (from LLM)
  const appSpec: FastformAppSpec = {} as FastformAppSpec

  // Step 3: Inject invariants
  console.log('Step 1: Injecting invariants...')
  const result = await injectInvariants(v0Code, appSpec)
  console.log(`✓ Injected ${result.injectedFiles.length} files`)

  // Step 4: Extract files
  console.log('\nStep 2: Extracting files...')
  const files = extractFiles(result)
  console.log(`✓ Extracted ${Object.keys(files).length} files`)

  // Step 5: Validate
  console.log('\nStep 3: Validating...')
  const isValid = validateInjectedFiles(files)
  console.log(`✓ Validation: ${isValid ? 'PASS' : 'FAIL'}`)

  // Step 6: Deploy to GitHub (pseudo-code)
  console.log('\nStep 4: Ready for deployment')
  console.log('Files ready to commit:')
  Object.keys(files).forEach((path) => {
    console.log(`  - ${path}`)
  })

  return {
    result,
    files,
    isValid,
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  ;(async () => {
    try {
      await exampleBasicInjection()
      console.log('\n---\n')
      await exampleFileExtraction()
      console.log('\n---\n')
      await exampleDeploymentWorkflow()
    } catch (error) {
      console.error('Example failed:', error)
      process.exit(1)
    }
  })()
}

export {
  exampleBasicInjection,
  exampleFileExtraction,
  exampleDeploymentWorkflow,
}
