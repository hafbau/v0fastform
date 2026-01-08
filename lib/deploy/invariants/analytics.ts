/**
 * Fastform Analytics Integration
 *
 * Event tracking integration for generated apps.
 * Sends analytics events to the Fastform backend for monitoring and insights.
 *
 * This file is automatically injected into all generated apps.
 *
 * @module analytics
 */

/**
 * Analytics event properties
 */
export interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

/**
 * Check if we're running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Get the analytics API endpoint
 */
function getAnalyticsEndpoint(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_FASTFORM_API_URL ||
    'https://api.fastform.app/v1'
  return `${baseUrl}/analytics/events`
}

/**
 * Get the current app ID from environment
 */
function getAppId(): string | undefined {
  return process.env.NEXT_PUBLIC_APP_ID
}

/**
 * Track an analytics event
 *
 * In development mode, logs to console.
 * In production mode, sends to Fastform analytics API.
 *
 * @param eventName - The name of the event to track
 * @param properties - Optional event properties/metadata
 *
 * @example
 * ```typescript
 * // Simple event
 * trackEvent('page_viewed', { page: '/welcome' })
 *
 * // Event with multiple properties
 * trackEvent('form_submitted', {
 *   formId: 'intake-form',
 *   fields: 12,
 *   duration: 245
 * })
 * ```
 */
export function trackEvent(
  eventName: string,
  properties?: EventProperties
): void {
  const appId = getAppId()

  // Enhance properties with standard metadata
  const enrichedProperties: EventProperties = {
    ...properties,
    appId,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  }

  // In development, log to console
  if (isDevelopment()) {
    console.log('[Analytics]', eventName, enrichedProperties)
    return
  }

  // In production, send to API
  sendEventToApi(eventName, enrichedProperties)
}

/**
 * Send event to Fastform analytics API
 *
 * Fires asynchronously and doesn't block execution.
 * Errors are logged but don't throw.
 */
function sendEventToApi(
  eventName: string,
  properties: EventProperties
): void {
  const endpoint = getAnalyticsEndpoint()

  // Send event asynchronously, don't await or block
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: eventName,
      properties,
    }),
    // Use keepalive to ensure event is sent even if page unloads
    keepalive: true,
  }).catch((error) => {
    // Log errors but don't throw - analytics failures shouldn't break the app
    console.error('[Analytics] Failed to send event:', error)
  })
}

/**
 * Track a page view event
 *
 * Convenience function for page view tracking.
 *
 * @param pagePath - The page path (e.g., '/welcome', '/form')
 * @param pageTitle - Optional page title
 *
 * @example
 * ```typescript
 * // In your page component
 * useEffect(() => {
 *   trackPageView('/welcome', 'Welcome Page')
 * }, [])
 * ```
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  trackEvent('page_viewed', {
    page: pagePath,
    title: pageTitle,
  })
}

/**
 * Track a form submission event
 *
 * Convenience function for form submission tracking.
 *
 * @param formId - The form identifier
 * @param fieldCount - Number of fields submitted
 *
 * @example
 * ```typescript
 * const handleSubmit = async (data) => {
 *   trackFormSubmission('intake-form', Object.keys(data).length)
 *   await submitToApi(data)
 * }
 * ```
 */
export function trackFormSubmission(
  formId: string,
  fieldCount: number
): void {
  trackEvent('form_submitted', {
    formId,
    fieldCount,
  })
}

/**
 * Track a workflow transition event
 *
 * Convenience function for workflow state change tracking.
 *
 * @param submissionId - The submission ID
 * @param fromState - Previous state
 * @param toState - New state
 *
 * @example
 * ```typescript
 * trackTransition('sub-123', 'SUBMITTED', 'APPROVED')
 * ```
 */
export function trackTransition(
  submissionId: string,
  fromState: string,
  toState: string
): void {
  trackEvent('workflow_transition', {
    submissionId,
    fromState,
    toState,
  })
}
