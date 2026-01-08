/**
 * Heuristic name and slug generator for app creation.
 * Generates instant name/slug from user intent before LLM refinement.
 */

const COMMON_PREFIXES = [
  'i need an',
  'i need a',
  'build me an',
  'build me a',
  'create an',
  'create a',
  'make me an',
  'make me a',
  'i want an',
  'i want a',
] as const

const NAME_MAX_LENGTH = 50
const SLUG_MAX_LENGTH = 30

interface HeuristicNameResult {
  name: string
  slug: string
}

/**
 * Generate heuristic name and slug from user intent.
 *
 * @param intent - User's input describing what they want to build
 * @returns Object containing title-cased name and slugified URL-safe slug
 *
 * @example
 * generateHeuristicName('I need a task manager')
 * // { name: 'Task Manager', slug: 'task-manager' }
 *
 * @example
 * generateHeuristicName('Build me an e-commerce site!')
 * // { name: 'E-commerce Site', slug: 'e-commerce-site' }
 */
export function generateHeuristicName(intent: string): HeuristicNameResult {
  // Normalize whitespace (replace newlines, tabs, multiple spaces)
  let processed = intent.replace(/\s+/g, ' ').trim()

  // Strip common prefixes (case-insensitive)
  const lowerProcessed = processed.toLowerCase()
  for (const prefix of COMMON_PREFIXES) {
    if (lowerProcessed.startsWith(prefix)) {
      processed = processed.slice(prefix.length).trim()
      break
    }
  }

  // Check if result is too short or empty (allow single character)
  if (processed.length === 0) {
    return {
      name: 'Untitled App',
      slug: 'untitled-app',
    }
  }

  // Generate name (title-cased)
  const name = generateName(processed)

  // Generate slug (lowercase, hyphenated, no special chars)
  const slug = generateSlug(processed)

  // Validate slug is not empty after cleaning
  if (slug.length === 0) {
    return {
      name: 'Untitled App',
      slug: 'untitled-app',
    }
  }

  return { name, slug }
}

/**
 * Convert text to title case with truncation.
 */
function generateName(text: string): string {
  // Title case conversion
  const titleCased = text
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')

  // Truncate if needed (NAME_MAX_LENGTH includes ellipsis)
  if (titleCased.length <= NAME_MAX_LENGTH) {
    return titleCased
  }

  // Reserve 3 characters for ellipsis
  const maxWithoutEllipsis = NAME_MAX_LENGTH - 3
  let truncated = titleCased.slice(0, maxWithoutEllipsis)

  // Try to truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxWithoutEllipsis * 0.6) { // Keep at least 60% of max length
    truncated = truncated.slice(0, lastSpace)
  }

  return truncated + '...'
}

/**
 * Convert text to URL-safe slug.
 */
function generateSlug(text: string): string {
  let slug = text
    .toLowerCase()
    // Normalize unicode characters (remove accents)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove emojis and non-ASCII characters
    .replace(/[^\x00-\x7F]/g, '')
    // Replace underscores with hyphens
    .replace(/_/g, '-')
    // Remove special characters except hyphens, spaces, and alphanumeric
    .replace(/[^a-z0-9\s-]/g, ' ')
    // Replace whitespace with hyphens
    .replace(/\s+/g, '-')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')

  // Truncate to max length
  if (slug.length > SLUG_MAX_LENGTH) {
    slug = slug.slice(0, SLUG_MAX_LENGTH)
    // Remove trailing hyphen after truncation
    slug = slug.replace(/-+$/, '')
  }

  return slug
}
