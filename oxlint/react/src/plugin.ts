import type { ESLint } from 'eslint'
import { noAppConcerns } from './rules/no-app-concerns.ts'
import { noDirectZustand } from './rules/no-direct-zustand.ts'
import { noInlineQueryKey } from './rules/no-inline-query-key.ts'
import { noRawContext } from './rules/no-raw-context.ts'
import { noRawEffect } from './rules/no-raw-effect.ts'
import { noRawState } from './rules/no-raw-state.ts'
import { noRawText } from './rules/no-raw-text.ts'
import { storePlacement } from './rules/store-placement.ts'
import { useQuerySignal } from './rules/use-query-signal.ts'

export const NAMESPACE = '@inflexa-ai/react'

/**
 * The rules of Inflexa for React applications: where state, effects, context,
 * network access and text live. The stack is part of the rules: TanStack Query
 * and Router, zustand through a feature-store factory, and a text catalog.
 *
 * Each rule is checked against `TSESLint.RuleModule` where it is declared.
 */
const rules = {
  'no-app-concerns': noAppConcerns,
  'no-direct-zustand': noDirectZustand,
  'no-inline-query-key': noInlineQueryKey,
  'no-raw-context': noRawContext,
  'no-raw-effect': noRawEffect,
  'no-raw-state': noRawState,
  'no-raw-text': noRawText,
  'store-placement': storePlacement,
  'use-query-signal': useQuerySignal,
}

/**
 * `meta.namespace` lets a configuration register the plugin under a different
 * key, and ESLint still maps the rule ids of the configs below to that key.
 */
export const plugin: ESLint.Plugin = {
  meta: { name: '@inflexa-ai/oxlint-plugin-react', namespace: NAMESPACE },
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
