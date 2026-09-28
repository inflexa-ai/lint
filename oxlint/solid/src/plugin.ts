import type { Plugin } from '@oxlint/plugins'
import { noRawContext } from './rules/no-raw-context.ts'
import { requireCleanup } from './rules/require-cleanup.ts'

/**
 * The rules of Inflexa for SolidJS applications: where a context comes from,
 * and which subscription a component ends.
 */
const rules = {
  'no-raw-context': noRawContext,
  'require-cleanup': requireCleanup,
}

export const plugin: Plugin = {
  meta: { name: '@inflexa-ai/oxlint-plugin-solid' },
  rules,
}
