import type { ESLint } from 'eslint'
import { noRawContext } from './rules/no-raw-context.ts'
import { requireCleanup } from './rules/require-cleanup.ts'

export const NAMESPACE = '@inflexa-ai/solid'

/**
 * The rules of Inflexa for SolidJS applications: where a context comes from,
 * and which subscription a component ends.
 *
 * Each rule is checked against `TSESLint.RuleModule` where it is declared.
 */
const rules = {
  'no-raw-context': noRawContext,
  'require-cleanup': requireCleanup,
}

/**
 * `meta.namespace` lets a configuration register the plugin under a different
 * key, and ESLint still maps the rule ids of the configs below to that key.
 */
export const plugin: ESLint.Plugin = {
  meta: { name: '@inflexa-ai/oxlint-plugin-solid', namespace: NAMESPACE },
  // SAFETY: typescript-eslint types a rule with its own AST, and its rule type
  // still admits the function form that ESLint 10 removed, thus the compiler
  // relates neither type to the other. The objects are the rule modules that
  // oxlint and ESLint run: each one satisfies `TSESLint.RuleModule` where it is
  // declared, and both linters hand `create()` an AST of the TSESTree shape,
  // oxlint from its own parser and ESLint from the parser of typescript-eslint.
  // The bridge has no cast-free form, so oxlint.config.ts switches the two cast
  // rules off for this file alone.
  rules: rules as unknown as ESLint.Plugin['rules'],
}
