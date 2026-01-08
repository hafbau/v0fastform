/**
 * Fastform API Client
 *
 * Central client for communicating with the Fastform backend.
 * Handles form submissions, data retrieval, and status updates.
 *
 * This file is automatically injected into all generated apps.
 *
 * @module fastformClient
 */

/**
 * Submission data structure returned from the API
 */
export interface Submission {
  /** Unique submission identifier */
  id: string
  /** Application ID this submission belongs to */
  appId: string
  /** Current workflow state */
  status: string
  /** Submission form data */
  data: Record<string, unknown>
  /** ISO timestamp of creation */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
  /** Optional staff notes */
  notes?: string
}

/**
 * API response for form submission
 */
export interface SubmitFormResponse {
  /** Newly created submission ID */
  submissionId: string
}

/**
 * API error structure
 */
export class FastformApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: unknown
  ) {
    super(message)
    this.name = 'FastformApiError'
  }
}

/**
 * Get the base API URL from environment variables
 * Falls back to production URL if not set
 */
function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FASTFORM_API_URL ||
    'https://api.fastform.app/v1'
  )
}

/**
 * Get authentication headers for API requests
 * Includes session token if available (server-side only)
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Include auth token if available (server-side)
  if (typeof window === 'undefined') {
    const authToken = process.env.FASTFORM_API_KEY
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
  }

  return headers
}

/**
 * Handle API response and errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorBody: unknown
    try {
      errorBody = await response.json()
    } catch {
      errorBody = await response.text()
    }

    throw new FastformApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorBody
    )
  }

  return response.json() as Promise<T>
}

/**
 * Submit a form to the Fastform backend
 *
 * @param appId - The application ID
 * @param data - Form data to submit
 * @returns Promise resolving to submission ID
 * @throws {FastformApiError} If the API request fails
 *
 * @example
 * ```typescript
 * const result = await fastformApi.submitForm('app-123', {
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@example.com'
 * })
 * console.log('Submission ID:', result.submissionId)
 * ```
 */
async function submitForm(
  appId: string,
  data: Record<string, unknown>
): Promise<SubmitFormResponse> {
  const url = `${getBaseUrl()}/apps/${appId}/submissions`

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ data }),
  })

  return handleResponse<SubmitFormResponse>(response)
}

/**
 * Get submissions for an app, optionally filtered by status
 *
 * @param appId - The application ID
 * @param status - Optional status filter
 * @returns Promise resolving to array of submissions
 * @throws {FastformApiError} If the API request fails
 *
 * @example
 * ```typescript
 * // Get all submissions
 * const all = await fastformApi.getSubmissions('app-123')
 *
 * // Get only submitted items
 * const submitted = await fastformApi.getSubmissions('app-123', 'SUBMITTED')
 * ```
 */
async function getSubmissions(
  appId: string,
  status?: string
): Promise<Submission[]> {
  const url = new URL(`${getBaseUrl()}/apps/${appId}/submissions`)

  if (status) {
    url.searchParams.set('status', status)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  return handleResponse<Submission[]>(response)
}

/**
 * Get a single submission by ID
 *
 * @param submissionId - The submission ID
 * @returns Promise resolving to submission data
 * @throws {FastformApiError} If the API request fails
 *
 * @example
 * ```typescript
 * const submission = await fastformApi.getSubmission('sub-123')
 * console.log(submission.status)
 * ```
 */
async function getSubmission(submissionId: string): Promise<Submission> {
  const url = `${getBaseUrl()}/submissions/${submissionId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  return handleResponse<Submission>(response)
}

/**
 * Update the status of a submission
 *
 * @param submissionId - The submission ID
 * @param status - New status value
 * @param notes - Optional staff notes
 * @throws {FastformApiError} If the API request fails
 *
 * @example
 * ```typescript
 * await fastformApi.updateSubmissionStatus(
 *   'sub-123',
 *   'APPROVED',
 *   'Looks good, approved by Dr. Smith'
 * )
 * ```
 */
async function updateSubmissionStatus(
  submissionId: string,
  status: string,
  notes?: string
): Promise<void> {
  const url = `${getBaseUrl()}/submissions/${submissionId}/status`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes }),
  })

  await handleResponse<void>(response)
}

/**
 * Resubmit a submission with updated data
 *
 * @param submissionId - The submission ID
 * @param data - Updated form data
 * @throws {FastformApiError} If the API request fails
 *
 * @example
 * ```typescript
 * await fastformApi.resubmitSubmission('sub-123', {
 *   ...existingData,
 *   additionalInfo: 'Updated information'
 * })
 * ```
 */
async function resubmitSubmission(
  submissionId: string,
  data: Record<string, unknown>
): Promise<void> {
  const url = `${getBaseUrl()}/submissions/${submissionId}/resubmit`

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ data }),
  })

  await handleResponse<void>(response)
}

/**
 * Fastform API client object
 * Provides methods for interacting with the Fastform backend
 */
export const fastformApi = {
  submitForm,
  getSubmissions,
  getSubmission,
  updateSubmissionStatus,
  resubmitSubmission,
}
