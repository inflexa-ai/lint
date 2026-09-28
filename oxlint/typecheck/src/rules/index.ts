import type { RuleModule } from '../rule.ts'
import { mustUseResult } from './must-use-result.ts'
import { noGeneratedEmptyObjectType } from './no-generated-empty-object-type.ts'
import { requireAbortSignal } from './require-abort-signal.ts'

/** The typed rules of this package, by their ids, which have no prefix. */
export const rules: Record<string, RuleModule> = {
  'must-use-result': mustUseResult,
  'no-generated-empty-object-type': noGeneratedEmptyObjectType,
  'require-abort-signal': requireAbortSignal,
}
