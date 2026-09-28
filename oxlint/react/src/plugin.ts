import type { Plugin } from '@oxlint/plugins'
import { noAppConcerns } from './rules/no-app-concerns.ts'
import { noDirectZustand } from './rules/no-direct-zustand.ts'
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
 * and Router, zustand through a store factory, and a text catalog.
 */
const rules = {
  'no-app-concerns': noAppConcerns,
  'no-direct-zustand': noDirectZustand,
  'no-raw-context': noRawContext,
  'no-raw-effect': noRawEffect,
  'no-raw-state': noRawState,
  'no-raw-text': noRawText,
  'store-placement': storePlacement,
  'use-query-signal': useQuerySignal,
}

export const plugin: Plugin = {
  meta: { name: '@inflexa-ai/oxlint-plugin-react' },
  rules,
}
