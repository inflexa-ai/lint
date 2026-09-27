import type { TSESLint } from '@typescript-eslint/utils'
import { moduleSourceVisitors } from '@inflexa-ai/oxlint-plugin/helpers/module-sources'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { storeFilePattern: string; factorySource?: string; bannedInStores: string[] }

const DEFAULTS: Options = {
  storeFilePattern: '\\.store\\.ts$',
  // No default: the module that exports the factory belongs to each repository,
  // and without it the placement half has nothing to find.
  bannedInStores: ['^@tanstack/(react-)?query'],
}

/**
 * Two halves of one guarantee: client state is findable, and it is only client
 * state. Stores live in files named for what they are, and those files cannot
 * reach the things that would let server data leak into them.
 */
export const storePlacement: TSESLint.RuleModule<'factoryOutsideStore' | 'serverDataInStore', [Partial<Options>]> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep feature stores in *.store.ts files and keep server data out of them',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/store-placement.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          storeFilePattern: { type: 'string' },
          factorySource: { type: 'string' },
          bannedInStores: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      factoryOutsideStore:
        "The factory from `{{factory}}` may only be used in a file named *.store.ts, so every piece of client state has a home that can be found by name. Move this store into <feature>.store.ts beside the feature's main component.",
      serverDataInStore:
        '`{{source}}` cannot be imported into a store file. A store holds client state only: a copy of server data is stale as soon as the query refetches. Read server data from the query in the component that renders it.',
    },
  },
  create(context) {
    const { storeFilePattern, factorySource, bannedInStores } = { ...DEFAULTS, ...context.options[0] }
    const isStoreFile = new RegExp(storeFilePattern).test(context.filename)
    const banned = bannedInStores.map((pattern) => new RegExp(pattern))

    return moduleSourceVisitors((source, specifier) => {
      if (!isStoreFile && factorySource !== undefined && specifier === factorySource) {
        context.report({ node: source, messageId: 'factoryOutsideStore', data: { factory: factorySource } })
      }
      if (isStoreFile && banned.some((pattern) => pattern.test(specifier))) {
        context.report({ node: source, messageId: 'serverDataInStore', data: { source: specifier } })
      }
    })
  },
}
