import { typescript, type TypedRulesOptions } from '@inflexa-ai/oxlint-plugin/eslint'
import type { Linter } from 'eslint'
import { NAMESPACE, plugin } from './plugin.ts'

/**
 * The part of the lint of a React repository that oxlint cannot run yet, as an
 * ESLint configuration: each block of `typescript()` from
 * `@inflexa-ai/oxlint-plugin/eslint`, and this plugin for its typed rule,
 * `no-inline-query-key`. A repository applies that rule in its own blocks.
 */
export function react(options: TypedRulesOptions): Linter.Config[] {
  return [...typescript(options), { name: '@inflexa-ai/react-typed-rules', files: ['**/*.{ts,tsx}'], plugins: { [NAMESPACE]: plugin } }]
}
