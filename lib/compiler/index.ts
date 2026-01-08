/**
 * AppSpec Compiler Module
 *
 * This module provides deterministic compilation of FastformAppSpec JSON
 * into natural language prompts suitable for v0 code generation.
 *
 * @module compiler
 */

export {
  compileAppSpecToPrompt,
  UnsupportedAppSpecFeatureError,
} from './appspec-to-prompt'
