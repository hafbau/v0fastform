/**
 * v0 Code Post-Processor
 *
 * Injects invariant files into v0-generated code to ensure every generated app
 * has the required infrastructure for communicating with the Fastform backend,
 * tracking analytics, and handling authentication.
 *
 * This post-processor:
 * 1. Adds invariant files (API client, analytics, auth middleware)
 * 2. Replaces template variables with app-specific values
 * 3. Configures route protection based on AppSpec roles
 *
 * @module post-processor
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import type { FastformAppSpec } from '../types/appspec'

/**
 * File injection result
 */
export interface InjectionResult {
  /** Original v0-generated code */
  original: string
  /** Code with injected invariants */
  modified: string
  /** List of injected files */
  injectedFiles: string[]
}

/**
 * Template variable replacement map
 */
interface TemplateVariables {
  /** Application ID */
  APP_ID: string
  /** Application slug */
  APP_SLUG: string
  /** Organization ID */
  ORG_ID: string
  /** Organization slug */
  ORG_SLUG: string
}

/**
 * Route configuration for middleware
 */
interface RouteConfig {
  path: string
  requiredRole?: string
  authRequired: boolean
}

/**
 * Load an invariant file from the invariants directory
 *
 * @param filename - Name of the invariant file
 * @returns File content as string
 */
async function loadInvariantFile(filename: string): Promise<string> {
  const invariantsDir = join(__dirname, 'invariants')
  const filePath = join(invariantsDir, filename)
  return readFile(filePath, 'utf-8')
}

/**
 * Create the fastformClient.ts file
 *
 * @returns File content as string
 */
export async function createFastformClient(): Promise<string> {
  return loadInvariantFile('fastformClient.ts')
}

/**
 * Create the analytics.ts file
 *
 * @returns File content as string
 */
export async function createAnalytics(): Promise<string> {
  return loadInvariantFile('analytics.ts')
}

/**
 * Create the auth-middleware.ts file
 *
 * @returns File content as string
 */
export async function createAuthMiddleware(): Promise<string> {
  return loadInvariantFile('auth-middleware.ts')
}

/**
 * Build route configuration from AppSpec
 *
 * @param spec - FastformAppSpec
 * @returns Array of route configurations
 */
function buildRouteConfig(spec: FastformAppSpec): RouteConfig[] {
  return spec.pages.map((page) => {
    const role = spec.roles.find((r) => r.id === page.role)

    return {
      path: page.route,
      requiredRole: role?.authRequired ? page.role : undefined,
      authRequired: role?.authRequired ?? false,
    }
  })
}

/**
 * Generate route configuration code for middleware
 *
 * @param routes - Array of route configurations
 * @returns JavaScript object literal as string
 */
function generateRouteConfigCode(routes: RouteConfig[]): string {
  const entries = routes.map((route) => {
    const config: Record<string, unknown> = {
      authRequired: route.authRequired,
    }

    if (route.requiredRole) {
      config.requiredRole = route.requiredRole
    }

    return `  '${route.path}': ${JSON.stringify(config)}`
  })

  return `{\n${entries.join(',\n')},\n}`
}

/**
 * Create the middleware.ts file with app-specific route configuration
 *
 * @param spec - FastformAppSpec
 * @returns File content as string
 */
export async function createMiddleware(spec: FastformAppSpec): Promise<string> {
  const baseMiddleware = await loadInvariantFile('middleware.ts')

  // Build route configuration from spec
  const routes = buildRouteConfig(spec)
  const routeConfigCode = generateRouteConfigCode(routes)

  // Replace the empty ROUTE_CONFIG with generated configuration
  const middlewareWithRoutes = baseMiddleware.replace(
    /const ROUTE_CONFIG: Record<string, { requiredRole\?: string; authRequired: boolean }> = {[^}]*}/,
    `const ROUTE_CONFIG: Record<string, { requiredRole?: string; authRequired: boolean }> = ${routeConfigCode}`
  )

  return middlewareWithRoutes
}

/**
 * Replace template variables in file content
 *
 * @param content - File content with template variables
 * @param variables - Variable replacement map
 * @returns Content with variables replaced
 */
function replaceTemplateVariables(
  content: string,
  variables: TemplateVariables
): string {
  let result = content

  // Replace all template variables
  result = result.replace(/\{\{APP_ID\}\}/g, variables.APP_ID)
  result = result.replace(/\{\{APP_SLUG\}\}/g, variables.APP_SLUG)
  result = result.replace(/\{\{ORG_ID\}\}/g, variables.ORG_ID)
  result = result.replace(/\{\{ORG_SLUG\}\}/g, variables.ORG_SLUG)

  return result
}

/**
 * Build template variables from AppSpec
 *
 * @param spec - FastformAppSpec
 * @returns Template variable map
 */
function buildTemplateVariables(spec: FastformAppSpec): TemplateVariables {
  return {
    APP_ID: spec.id,
    APP_SLUG: spec.meta.slug,
    ORG_ID: spec.meta.orgId,
    ORG_SLUG: spec.meta.orgSlug,
  }
}

/**
 * Format a file injection block for insertion into v0 code
 *
 * @param path - File path relative to project root
 * @param content - File content
 * @returns Formatted file block
 */
function formatFileBlock(path: string, content: string): string {
  return `
// ============================================================
// FILE: ${path}
// ============================================================
${content}

`
}

/**
 * Inject invariant files into v0-generated code
 *
 * This is the main entry point for the post-processor.
 *
 * @param v0GeneratedCode - Raw code output from v0
 * @param appSpec - FastformAppSpec defining the app
 * @returns Injection result with modified code
 *
 * @example
 * ```typescript
 * const v0Code = await generateWithV0(prompt)
 * const result = await injectInvariants(v0Code, appSpec)
 *
 * // Deploy result.modified to GitHub
 * await deployToGitHub(result.modified)
 *
 * console.log('Injected files:', result.injectedFiles)
 * ```
 */
export async function injectInvariants(
  v0GeneratedCode: string,
  appSpec: FastformAppSpec
): Promise<InjectionResult> {
  // Build template variables
  const variables = buildTemplateVariables(appSpec)

  // Load and process invariant files
  const fastformClient = await createFastformClient()
  const analytics = await createAnalytics()
  const authMiddleware = await createAuthMiddleware()
  const middleware = await createMiddleware(appSpec)

  // Replace template variables in all files
  const processedFiles = {
    fastformClient: replaceTemplateVariables(fastformClient, variables),
    analytics: replaceTemplateVariables(analytics, variables),
    authMiddleware: replaceTemplateVariables(authMiddleware, variables),
    middleware: replaceTemplateVariables(middleware, variables),
  }

  // Format file blocks for injection
  const injectedCode = [
    formatFileBlock('lib/fastformClient.ts', processedFiles.fastformClient),
    formatFileBlock('lib/analytics.ts', processedFiles.analytics),
    formatFileBlock('lib/auth-middleware.ts', processedFiles.authMiddleware),
    formatFileBlock('middleware.ts', processedFiles.middleware),
  ].join('\n')

  // Combine with original v0 code
  // In a real implementation, this would intelligently merge or append
  // For now, we'll prepend the invariant files
  const modifiedCode = `${injectedCode}\n// ============================================================\n// V0 GENERATED CODE\n// ============================================================\n\n${v0GeneratedCode}`

  return {
    original: v0GeneratedCode,
    modified: modifiedCode,
    injectedFiles: [
      'lib/fastformClient.ts',
      'lib/analytics.ts',
      'lib/auth-middleware.ts',
      'middleware.ts',
    ],
  }
}

/**
 * Extract file path and content from injection result
 *
 * Utility to parse the modified code into individual files for deployment.
 *
 * @param injectionResult - Result from injectInvariants
 * @returns Map of file paths to content
 *
 * @example
 * ```typescript
 * const result = await injectInvariants(v0Code, appSpec)
 * const files = extractFiles(result)
 *
 * for (const [path, content] of Object.entries(files)) {
 *   await writeFile(path, content)
 * }
 * ```
 */
export function extractFiles(
  injectionResult: InjectionResult
): Record<string, string> {
  const files: Record<string, string> = {}
  const fileBlockRegex = /\/\/ FILE: (.+?)\n\/\/ =+\n([\s\S]*?)(?=\n\/\/ =+\n\/\/ FILE:|$)/g

  let match
  while ((match = fileBlockRegex.exec(injectionResult.modified)) !== null) {
    const [, filePath, content] = match
    files[filePath.trim()] = content.trim()
  }

  return files
}

/**
 * Validate that all required invariant files are present
 *
 * @param files - Map of file paths to content
 * @returns True if all required files are present
 */
export function validateInjectedFiles(
  files: Record<string, string>
): boolean {
  const requiredFiles = [
    'lib/fastformClient.ts',
    'lib/analytics.ts',
    'lib/auth-middleware.ts',
    'middleware.ts',
  ]

  return requiredFiles.every((file) => file in files)
}
