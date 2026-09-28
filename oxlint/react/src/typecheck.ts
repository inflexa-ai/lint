import type { Plugin } from '@inflexa-ai/typecheck'
import { noInlineQueryKey } from './typed-rules/no-inline-query-key.ts'
import { noVoidQueryFn } from './typed-rules/no-void-query-fn.ts'

/**
 * The typed rules of Inflexa for React applications, as a plugin of
 * `inflexa-typecheck`. Their ids are `@inflexa-ai/react/<rule>`, and a
 * repository turns each one on in the overrides of its `typecheck.config.ts`.
 */
export const plugin: Plugin = {
  name: '@inflexa-ai/react',
  rules: {
    'no-inline-query-key': noInlineQueryKey,
    'no-void-query-fn': noVoidQueryFn,
  },
}
