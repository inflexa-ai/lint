import type { Plugin } from '@oxlint/plugins'
import { exportAtDeclaration } from './rules/export-at-declaration.ts'
import { noConditionalSpread } from './rules/no-conditional-spread.ts'
import { noDoubleCast } from './rules/no-double-cast.ts'
import { noEmptySchema } from './rules/no-empty-schema.ts'
import { noInstanceofError } from './rules/no-instanceof-error.ts'
import { noInterface } from './rules/no-interface.ts'
import { noModuleMocking } from './rules/no-module-mocking.ts'
import { noRawNetwork } from './rules/no-raw-network.ts'
import { noTypeofObject } from './rules/no-typeof-object.ts'
import { noUnknownParameters } from './rules/no-unknown-parameters.ts'
import { noUnknownReturns } from './rules/no-unknown-returns.ts'
import { noUnknownTypeAliases } from './rules/no-unknown-type-aliases.ts'
import { noUnknownTypeGuards } from './rules/no-unknown-type-guards.ts'
import { noUnsafeDictionary } from './rules/no-unsafe-dictionary.ts'
import { packageEntryPoints } from './rules/package-entry-points.ts'
import { requireAssertionSafety } from './rules/require-assertion-safety.ts'
import { testPlacement } from './rules/test-placement.ts'

export const NAMESPACE = '@inflexa-ai'

/**
 * The rules of Inflexa for TypeScript. They are named rules rather than entries
 * in `no-restricted-imports` because a flat config replaces the options of a
 * rule instead of merging them: two zones that restricted imports through one
 * built-in rule would silently drop the list of each other.
 */
const rules = {
  'export-at-declaration': exportAtDeclaration,
  'no-conditional-spread': noConditionalSpread,
  'no-double-cast': noDoubleCast,
  'no-empty-schema': noEmptySchema,
  'no-instanceof-error': noInstanceofError,
  'no-interface': noInterface,
  'no-module-mocking': noModuleMocking,
  'no-raw-network': noRawNetwork,
  'no-typeof-object': noTypeofObject,
  'no-unknown-parameters': noUnknownParameters,
  'no-unknown-returns': noUnknownReturns,
  'no-unknown-type-aliases': noUnknownTypeAliases,
  'no-unknown-type-guards': noUnknownTypeGuards,
  'no-unsafe-dictionary': noUnsafeDictionary,
  'package-entry-points': packageEntryPoints,
  'require-assertion-safety': requireAssertionSafety,
  'test-placement': testPlacement,
}

export const plugin: Plugin = {
  meta: { name: '@inflexa-ai/oxlint-plugin' },
  rules,
}
