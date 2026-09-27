import type { TSESLint } from '@typescript-eslint/utils'
import { moduleSourceVisitors } from '@inflexa-ai/oxlint-plugin/helpers/module-sources'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { also: { pattern: string; reason: string }[] }

const DEFAULTS: Options = { also: [] }

// Each of these is mounted once per application, so a shared package that
// imports one is tied to a single app's instance of it.
const SHARED_PACKAGE_CONCERNS = [
  {
    pattern: '^@tanstack/(react-)?query',
    reason: 'Server data belongs to the app. Take the data, and the callbacks that change it, as props.',
  },
  {
    pattern: '^@tanstack/(react-)?router',
    reason: 'Routing belongs to the app. Take an href or a navigate callback as a prop, or let the caller wrap the component in its own link.',
  },
]

/**
 * Shared packages stay usable by every app only while they know nothing about
 * any one of them. `also` adds zone-specific entries (the app workspaces
 * themselves, or a library one package may use and another may not).
 */
export const noAppConcerns: TSESLint.RuleModule<'concern', [Partial<Options>]> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep application concerns out of shared packages',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-app-concerns.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          also: {
            type: 'array',
            items: {
              type: 'object',
              properties: { pattern: { type: 'string' }, reason: { type: 'string' } },
              required: ['pattern', 'reason'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      concern: '`{{source}}` is an application concern and cannot be imported from a shared package. {{reason}}',
    },
  },
  create(context) {
    const { also } = { ...DEFAULTS, ...context.options[0] }
    const concerns = [...SHARED_PACKAGE_CONCERNS, ...also].map(({ pattern, reason }) => ({
      pattern: new RegExp(pattern),
      reason,
    }))

    return moduleSourceVisitors((source, specifier) => {
      const concern = concerns.find(({ pattern }) => pattern.test(specifier))
      if (concern) {
        context.report({
          node: source,
          messageId: 'concern',
          data: { source: specifier, reason: concern.reason },
        })
      }
    })
  },
}
