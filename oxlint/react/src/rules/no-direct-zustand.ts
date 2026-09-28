import type { Rule } from '@oxlint/plugins'
import { moduleSourceVisitors } from '@inflexa-ai/oxlint-plugin/helpers/module-sources'
import { optionObject, stringOption } from '@inflexa-ai/oxlint-plugin/helpers/rule-options'

/** The options of the rule, once oxlint has merged `meta.defaultOptions` into them. */
type Options = { hint: string }

const DEFAULTS: Options = { hint: '' }

/**
 * A store made with zustand's module-level `create()` is a singleton: its state
 * outlives navigation and is shared by every instance of the feature. A store
 * factory of the repository scopes a store to its mounted Provider instead, so
 * zustand itself is only imported where that factory lives. Type-only imports
 * are reported too; the factory re-exports the one type a store file needs.
 */
export const noDirectZustand: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reach zustand only through a store factory',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-direct-zustand.md',
    },
    schema: [
      {
        type: 'object',
        // The replacement this repository offers, which a shared rule cannot name.
        properties: { hint: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      direct:
        '`{{source}}` cannot be imported here. Build the store with the store factory of this repository, so each mounted feature gets its own store instead of a module-level singleton.{{hint}}',
    },
  },
  create(context) {
    const hint = stringOption(optionObject(context.options), 'hint', DEFAULTS.hint)
    return moduleSourceVisitors((source, specifier) => {
      if (/^zustand(\/|$)/.test(specifier)) {
        context.report({ node: source, messageId: 'direct', data: { source: specifier, hint: hint ? ` ${hint}` : '' } })
      }
    })
  },
}
