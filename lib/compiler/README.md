# AppSpec to Prompt Compiler

A deterministic compiler service that transforms FastformAppSpec JSON into natural language prompts for v0 code generation.

## Overview

This compiler is the bridge between Fastform's declarative AppSpec format and v0's natural language prompt interface. It ensures that:

1. **Deterministic Output**: Same AppSpec input always produces identical prompt output
2. **Validation**: Detects and rejects unsupported features before generation
3. **Comprehensive Translation**: All AppSpec elements are included in the generated prompt
4. **Constraint Enforcement**: Embeds critical implementation constraints for v0

## Installation

```typescript
import { compileAppSpecToPrompt, UnsupportedAppSpecFeatureError } from '@/lib/compiler'
import type { FastformAppSpec } from '@/lib/types/appspec'
```

## Basic Usage

```typescript
import { compileAppSpecToPrompt } from '@/lib/compiler'
import { PSYCH_INTAKE_TEMPLATE } from '@/lib/templates/psych-intake-lite'

// Compile AppSpec to prompt
const prompt = compileAppSpecToPrompt(PSYCH_INTAKE_TEMPLATE)

// Send to v0 for code generation
const generatedCode = await v0.generate(prompt)
```

## Error Handling

The compiler validates AppSpec against v1 supported features and throws `UnsupportedAppSpecFeatureError` when unsupported features are detected.

```typescript
import { compileAppSpecToPrompt, UnsupportedAppSpecFeatureError } from '@/lib/compiler'

try {
  const prompt = compileAppSpecToPrompt(spec)
  return { success: true, prompt }
} catch (error) {
  if (error instanceof UnsupportedAppSpecFeatureError) {
    return {
      success: false,
      error: error.message,
      feature: error.feature,
      suggestion: error.suggestion,
    }
  }
  throw error
}
```

## Supported Features (v1)

### Page Types
- `welcome` - Consent and start page
- `form` - Input fields page
- `review` - Confirm before submit/resubmit
- `success` - Post-submit confirmation
- `login` - Staff authentication
- `list` - Inbox/table view
- `detail` - Single submission detail view

### Field Types
- `text` - Single-line text input
- `email` - Email address
- `tel` - Phone number
- `date` - Date picker
- `textarea` - Multi-line text
- `select` - Dropdown menu
- `radio` - Radio buttons
- `checkbox` - Checkbox
- `number` - Numeric input

### Workflow States
- `DRAFT` - Client-only, not persisted
- `SUBMITTED` - Submitted by patient
- `NEEDS_INFO` - More information requested
- `APPROVED` - Approved by staff
- `REJECTED` - Rejected by staff

### Workflow Complexity
- Simple linear workflows with basic branching
- Maximum ~3x transitions per state (heuristic)
- No multi-step approval chains

## Prompt Structure

The generated prompt includes:

1. **Application Header**
   - App name, description, organization info
   - App ID and slug

2. **User Roles**
   - Role types (PATIENT, STAFF)
   - Authentication requirements
   - Route prefixes

3. **Theme Configuration**
   - Preset name
   - Logo URL
   - Custom color overrides

4. **Pages**
   - Page type, route, role, title, description
   - Field definitions with validation rules
   - Actions with state transitions

5. **Workflow**
   - Valid states
   - Initial state
   - State transitions with role permissions

6. **API Configuration**
   - Base URL (environment variable)
   - All available endpoints

7. **Analytics Events**
   - Event tracking configuration

8. **Deployment Environments**
   - Staging and production domains
   - API URLs for each environment

9. **Critical Implementation Constraints**
   - No external UI/form libraries
   - Server Actions only for mutations
   - camelCase PostgreSQL columns
   - Multi-tenancy requirements
   - Type safety requirements
   - Error handling standards
   - Authentication approach
   - Responsive design
   - Accessibility requirements

## API Reference

### `compileAppSpecToPrompt(spec: FastformAppSpec): string`

Compiles a FastformAppSpec into a comprehensive natural language prompt.

**Parameters:**
- `spec: FastformAppSpec` - The app specification to compile

**Returns:**
- `string` - The generated natural language prompt

**Throws:**
- `UnsupportedAppSpecFeatureError` - When spec contains unsupported features

**Example:**
```typescript
const prompt = compileAppSpecToPrompt(myAppSpec)
console.log(prompt.length) // e.g., 7436 characters
```

### `UnsupportedAppSpecFeatureError`

Custom error class for unsupported features.

**Properties:**
- `message: string` - Human-readable error message
- `feature: string` - The unsupported feature identifier (e.g., "field.type.file")
- `suggestion?: string` - Optional suggestion for alternatives

**Example:**
```typescript
catch (error) {
  if (error instanceof UnsupportedAppSpecFeatureError) {
    console.log(error.feature)     // "field.type.file"
    console.log(error.message)     // "Field type "file" is not supported..."
    console.log(error.suggestion)  // "Use one of: text, email, tel..."
  }
}
```

## Determinism Guarantees

The compiler is **strictly deterministic**:

- No timestamps in output
- No randomness or UUID generation
- No environment-dependent values
- Stable sorting (e.g., API endpoints sorted alphabetically)
- Consistent string formatting

This ensures:
- Reliable caching
- Reproducible builds
- Easy comparison of outputs
- Predictable behavior in production

## Testing

The compiler has 64 comprehensive tests covering:

- Deterministic output verification
- All page types and field types
- Workflow configuration
- Validation and conditional fields
- Actions and state transitions
- API and analytics configuration
- Environments and theme
- Unsupported feature detection
- Edge cases (special characters, empty arrays, minimal specs)

Run tests:
```bash
npm test lib/compiler/appspec-to-prompt.test.ts
```

## Example Output

For the Psych Intake Lite template, the compiler generates a ~7,400 character prompt that includes:

- 10 pages (welcome, form, review, success, resume pages, staff login, inbox, detail)
- 10 form fields with validation rules
- 3 staff actions (Approve, Request Info, Reject)
- 5 workflow states with 6 transitions
- 10 API endpoints
- 10 analytics events
- 2 deployment environments
- 10 critical implementation constraints

See `example-usage.ts` for a working demonstration.

## Architecture Notes

### Why Natural Language Prompts?

v0 uses natural language prompts for code generation. While this adds a translation layer, it provides:

1. **Flexibility**: v0 can interpret nuanced requirements
2. **Human-Readable**: Prompts can be inspected and modified
3. **Evolution**: Prompt format can evolve independently of AppSpec
4. **Debugging**: Easy to see what v0 is being asked to generate

### Why Validation?

Validating against v1 supported features:

1. **Fail Fast**: Catch unsupported features before generation
2. **Clear Errors**: Provide actionable error messages
3. **Safety**: Prevent wasted v0 generation calls
4. **Evolution**: Easy to add new features in future versions

### Why Determinism?

Deterministic output enables:

1. **Caching**: Cache prompts by AppSpec hash
2. **Testing**: Reliable snapshot testing
3. **Comparison**: Easily diff AppSpec changes
4. **Reproducibility**: Same spec always produces same app

## Future Enhancements

Potential improvements for future versions:

1. **v2 Feature Support**: Add file uploads, custom components, etc.
2. **Optimization**: Compress prompts while maintaining information
3. **Localization**: Generate prompts in different languages
4. **Validation Levels**: Strict vs. permissive validation modes
5. **Prompt Variants**: Different prompt styles for different generators

## Related Modules

- `@/lib/types/appspec` - FastformAppSpec type definitions
- `@/lib/templates/psych-intake-lite` - Example AppSpec template
- `@/lib/ai/appspec-generator` - AI-powered AppSpec generation

## Support

For issues or questions about the compiler:

1. Check existing tests for usage examples
2. Review `example-usage.ts` for patterns
3. Refer to AppSpec documentation in `@/lib/types/appspec`
4. Check validation error messages for specific guidance
