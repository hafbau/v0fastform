/**
 * FastformAppSpec v0.3 TypeScript Type Definitions
 *
 * This module defines the complete type system for Fastform App Specifications.
 * AppSpec is the canonical, versioned config that describes an app, which Fastform
 * uses to generate a deployable mini-app (via v0) and wire it to the backend.
 *
 * @module appspec
 * @version 0.3
 */

/**
 * The root FastformAppSpec interface representing the complete application specification.
 * This is the source of truth for all app configuration and generation.
 */
export interface FastformAppSpec {
  /** Unique identifier for the app (UUID) */
  id: string
  /** Schema version, must be "0.3" */
  version: '0.3'
  /** Application metadata and organization info */
  meta: AppMeta
  /** Theme and branding configuration */
  theme: ThemeConfig
  /** Role definitions for multi-role apps */
  roles: Role[]
  /** Page definitions including routes, fields, and actions */
  pages: Page[]
  /** Workflow state machine configuration */
  workflow: WorkflowConfig
  /** API endpoint configuration */
  api: ApiConfig
  /** Analytics event tracking configuration */
  analytics: AnalyticsConfig
  /** Environment-specific deployment configuration */
  environments: EnvironmentConfig
}

/**
 * Application metadata and organization information.
 * Contains identifying information and human-readable names.
 */
export interface AppMeta {
  /** Human-readable app name */
  name: string
  /** URL-safe slug for the app */
  slug: string
  /** Brief description of the app's purpose */
  description: string
  /** Organization ID (UUID) */
  orgId: string
  /** Organization URL-safe slug */
  orgSlug: string
}

/**
 * Theme and visual branding configuration.
 * Controls the visual appearance of the generated app.
 */
export interface ThemeConfig {
  /** Preset theme name */
  preset: 'healthcare-calm'
  /** Optional logo URL */
  logo?: string
  /** Optional custom color overrides */
  colors?: {
    /** Primary brand color (hex) */
    primary?: string
    /** Background color (hex) */
    background?: string
    /** Text color (hex) */
    text?: string
  }
}

/**
 * Role definition for multi-role applications.
 * Defines user roles and their authentication requirements.
 */
export interface Role {
  /** Role identifier */
  id: 'PATIENT' | 'STAFF'
  /** Whether this role requires authentication */
  authRequired: boolean
  /** Optional route prefix for role-specific pages (e.g., "/staff") */
  routePrefix?: string
}

/**
 * Page type enumeration.
 * Defines the available page templates in the system.
 */
export type PageType =
  | 'welcome' // Consent and start page
  | 'form' // Input fields page
  | 'review' // Confirm before submit/resubmit
  | 'success' // Post-submit confirmation
  | 'login' // Staff authentication
  | 'list' // Inbox/table view
  | 'detail' // Single submission detail view

/**
 * Page definition including route, fields, and actions.
 * Represents a single page in the generated application.
 */
export interface Page {
  /** Unique page identifier */
  id: string
  /** Route path (supports dynamic segments like [id]) */
  route: string
  /** Role that can access this page */
  role: 'PATIENT' | 'STAFF'
  /** Page template type */
  type: PageType
  /** Page title displayed to users */
  title: string
  /** Optional page description */
  description?: string
  /** Form fields for form/welcome pages */
  fields?: Field[]
  /** Actions available on detail/review pages */
  actions?: Action[]
}

/**
 * Field type enumeration.
 * Defines the available form input types.
 */
export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'number'

/**
 * Form field definition.
 * Represents a single input field in a form.
 */
export interface Field {
  /** Unique field identifier */
  id: string
  /** Input type */
  type: FieldType
  /** Field label displayed to users */
  label: string
  /** Optional placeholder text */
  placeholder?: string
  /** Whether the field is required */
  required?: boolean
  /** Options for select/radio fields */
  options?: Option[]
  /** Conditional visibility rule */
  condition?: Condition
  /** Validation rules */
  validation?: ValidationRule[]
}

/**
 * Option for select/radio fields.
 */
export interface Option {
  /** Option value stored in data */
  value: string
  /** Option label displayed to users */
  label: string
}

/**
 * Conditional visibility rule for fields.
 * Controls when a field should be shown based on another field's value.
 */
export interface Condition {
  /** Field ID to check */
  field: string
  /** Comparison operator */
  operator: 'equals' | 'not_equals' | 'exists'
  /** Value to compare against (not required for "exists" operator) */
  value?: string | boolean
}

/**
 * Field validation rule.
 * Defines validation constraints for form fields.
 */
export interface ValidationRule {
  /** Validation rule type */
  type: 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max'
  /** Validation value (string pattern or numeric limit) */
  value: string | number
  /** Error message displayed when validation fails */
  message: string
}

/**
 * Action available on detail/review pages.
 * Defines staff actions that transition submission state.
 */
export interface Action {
  /** Unique action identifier */
  id: string
  /** Action label displayed on button */
  label: string
  /** Target workflow state after action */
  targetState: WorkflowState
  /** Whether action requires a note/comment */
  requiresNote?: boolean
  /** Button visual variant */
  variant: 'primary' | 'secondary' | 'danger'
}

/**
 * Workflow state enumeration.
 * Defines the possible states in the submission workflow.
 */
export type WorkflowState =
  | 'DRAFT' // Client-only, not persisted (conceptual initial state)
  | 'SUBMITTED' // Submitted by patient
  | 'NEEDS_INFO' // More information requested by staff
  | 'APPROVED' // Approved by staff
  | 'REJECTED' // Rejected by staff

/**
 * Workflow state machine configuration.
 * Defines valid states and transitions.
 */
export interface WorkflowConfig {
  /** All possible states */
  states: WorkflowState[]
  /** Conceptual initial state (DRAFT) */
  initialState: WorkflowState
  /** Valid state transitions */
  transitions: Transition[]
}

/**
 * Workflow state transition rule.
 * Defines valid state changes and who can perform them.
 */
export interface Transition {
  /** Source state(s) - can be a single state or array of states */
  from: WorkflowState | WorkflowState[]
  /** Target state */
  to: WorkflowState
  /** Roles allowed to perform this transition */
  allowedRoles: ('PATIENT' | 'STAFF')[]
}

/**
 * API configuration for the generated app.
 * Defines backend endpoints the generated app will call.
 */
export interface ApiConfig {
  /**
   * Runtime base URL placeholder.
   * Always read from env var NEXT_PUBLIC_FASTFORM_API_URL at runtime.
   * This value exists as a placeholder for prompt compilation only.
   */
  baseUrl: '{{FASTFORM_API_URL}}'
  /** API endpoint definitions */
  endpoints: {
    // Patient endpoints
    createSubmission: string
    getSubmission: string
    resubmitSubmission: string

    // Staff auth endpoints
    staffLogin: string
    staffLogout: string
    staffSession: string

    // Staff endpoints
    listSubmissions: string
    getSubmissionDetail: string
    transitionSubmission: string

    // Analytics
    trackEvent: string
  }
}

/**
 * Analytics configuration.
 * Defines events to track in the generated app.
 */
export interface AnalyticsConfig {
  /** Analytics events to track */
  events: AnalyticsEvent[]
}

/**
 * Analytics event definition.
 * Specifies when and what to track.
 */
export interface AnalyticsEvent {
  /** Event name */
  name: string
  /** Event trigger type */
  trigger: 'pageview' | 'action' | 'submit' | 'transition'
  /** Optional page route for pageview triggers */
  page?: string
}

/**
 * Environment-specific configuration.
 * Defines staging and production deployment settings.
 */
export interface EnvironmentConfig {
  /** Staging environment configuration */
  staging: {
    /** Domain template for staging */
    domain: string
    /** API URL for staging environment */
    apiUrl: string
  }
  /** Production environment configuration */
  production: {
    /** Domain template for production */
    domain: string
    /** API URL for production environment */
    apiUrl: string
  }
}

/**
 * Type guard to validate an unknown object as a FastformAppSpec.
 * Performs runtime validation against the v0.3 schema.
 *
 * @param obj - Object to validate
 * @returns True if obj is a valid FastformAppSpec, false otherwise
 *
 * @example
 * ```typescript
 * const data: unknown = JSON.parse(jsonString)
 * if (isValidAppSpec(data)) {
 *   // data is now typed as FastformAppSpec
 *   console.log(data.meta.name)
 * }
 * ```
 */
export function isValidAppSpec(obj: unknown): obj is FastformAppSpec {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const spec = obj as Partial<FastformAppSpec>

  // Validate required top-level fields
  if (
    typeof spec.id !== 'string' ||
    spec.version !== '0.3' ||
    !spec.meta ||
    !spec.theme ||
    !Array.isArray(spec.roles) ||
    !Array.isArray(spec.pages) ||
    !spec.workflow ||
    !spec.api ||
    !spec.analytics ||
    !spec.environments
  ) {
    return false
  }

  // Validate meta
  if (
    typeof spec.meta !== 'object' ||
    typeof spec.meta.name !== 'string' ||
    typeof spec.meta.slug !== 'string' ||
    typeof spec.meta.description !== 'string' ||
    typeof spec.meta.orgId !== 'string' ||
    typeof spec.meta.orgSlug !== 'string'
  ) {
    return false
  }

  // Validate theme
  if (
    typeof spec.theme !== 'object' ||
    spec.theme.preset !== 'healthcare-calm'
  ) {
    return false
  }

  // Validate roles
  if (!validateRoles(spec.roles)) {
    return false
  }

  // Validate pages
  if (!validatePages(spec.pages)) {
    return false
  }

  // Validate workflow
  if (!validateWorkflow(spec.workflow)) {
    return false
  }

  // Validate api
  if (!validateApi(spec.api)) {
    return false
  }

  // Validate analytics
  if (!validateAnalytics(spec.analytics)) {
    return false
  }

  // Validate environments
  if (!validateEnvironments(spec.environments)) {
    return false
  }

  return true
}

/**
 * Validates the roles array.
 */
function validateRoles(roles: unknown): roles is Role[] {
  if (!Array.isArray(roles)) {
    return false
  }

  return roles.every(
    (role) =>
      role &&
      typeof role === 'object' &&
      (role.id === 'PATIENT' || role.id === 'STAFF') &&
      typeof role.authRequired === 'boolean'
  )
}

/**
 * Validates the pages array.
 */
function validatePages(pages: unknown): pages is Page[] {
  if (!Array.isArray(pages)) {
    return false
  }

  const validPageTypes: PageType[] = [
    'welcome',
    'form',
    'review',
    'success',
    'login',
    'list',
    'detail',
  ]

  return pages.every(
    (page) =>
      page &&
      typeof page === 'object' &&
      typeof page.id === 'string' &&
      typeof page.route === 'string' &&
      (page.role === 'PATIENT' || page.role === 'STAFF') &&
      validPageTypes.includes(page.type) &&
      typeof page.title === 'string'
  )
}

/**
 * Validates the workflow configuration.
 */
function validateWorkflow(workflow: unknown): workflow is WorkflowConfig {
  if (!workflow || typeof workflow !== 'object') {
    return false
  }

  const wf = workflow as Partial<WorkflowConfig>

  if (
    !Array.isArray(wf.states) ||
    typeof wf.initialState !== 'string' ||
    !Array.isArray(wf.transitions)
  ) {
    return false
  }

  const validStates: WorkflowState[] = [
    'DRAFT',
    'SUBMITTED',
    'NEEDS_INFO',
    'APPROVED',
    'REJECTED',
  ]

  // Validate states
  if (!wf.states.every((state) => validStates.includes(state))) {
    return false
  }

  // Validate initialState
  if (!validStates.includes(wf.initialState)) {
    return false
  }

  // Validate transitions
  return wf.transitions.every(
    (transition) =>
      transition &&
      typeof transition === 'object' &&
      (typeof transition.from === 'string' ||
        (Array.isArray(transition.from) &&
          transition.from.every((s) => typeof s === 'string'))) &&
      typeof transition.to === 'string' &&
      Array.isArray(transition.allowedRoles)
  )
}

/**
 * Validates the API configuration.
 */
function validateApi(api: unknown): api is ApiConfig {
  if (!api || typeof api !== 'object') {
    return false
  }

  const a = api as Partial<ApiConfig>

  return (
    a.baseUrl === '{{FASTFORM_API_URL}}' &&
    !!a.endpoints &&
    typeof a.endpoints === 'object' &&
    typeof a.endpoints.createSubmission === 'string' &&
    typeof a.endpoints.getSubmission === 'string' &&
    typeof a.endpoints.resubmitSubmission === 'string' &&
    typeof a.endpoints.staffLogin === 'string' &&
    typeof a.endpoints.staffLogout === 'string' &&
    typeof a.endpoints.staffSession === 'string' &&
    typeof a.endpoints.listSubmissions === 'string' &&
    typeof a.endpoints.getSubmissionDetail === 'string' &&
    typeof a.endpoints.transitionSubmission === 'string' &&
    typeof a.endpoints.trackEvent === 'string'
  )
}

/**
 * Validates the analytics configuration.
 */
function validateAnalytics(analytics: unknown): analytics is AnalyticsConfig {
  if (!analytics || typeof analytics !== 'object') {
    return false
  }

  const a = analytics as Partial<AnalyticsConfig>

  if (!Array.isArray(a.events)) {
    return false
  }

  const validTriggers = ['pageview', 'action', 'submit', 'transition']

  return a.events.every(
    (event) =>
      event &&
      typeof event === 'object' &&
      typeof event.name === 'string' &&
      validTriggers.includes(event.trigger)
  )
}

/**
 * Validates the environments configuration.
 */
function validateEnvironments(
  environments: unknown
): environments is EnvironmentConfig {
  if (!environments || typeof environments !== 'object') {
    return false
  }

  const env = environments as Partial<EnvironmentConfig>

  return (
    !!env.staging &&
    typeof env.staging === 'object' &&
    typeof env.staging.domain === 'string' &&
    typeof env.staging.apiUrl === 'string' &&
    !!env.production &&
    typeof env.production === 'object' &&
    typeof env.production.domain === 'string' &&
    typeof env.production.apiUrl === 'string'
  )
}
