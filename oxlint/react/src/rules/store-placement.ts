import type { Rule } from '@oxlint/plugins'
import path from 'node:path'
import { moduleSourceVisitors } from '@inflexa-ai/oxlint-plugin/helpers/module-sources'
import { optionalStringOption, optionObject, stringOption, stringsOption } from '@inflexa-ai/oxlint-plugin/helpers/rule-options'

/** The options of the rule, once oxlint has merged `meta.defaultOptions` into them. */
type Options = { storeFilePattern: string; factorySource?: string; factoryFile?: string; bannedInStores: string[] }

// No default: the module that exports the factory belongs to each repository,
// and without it the placement half has nothing to find.
const DEFAULTS: Options = {
  storeFilePattern: '\\.store\\.ts$',
  bannedInStores: ['^@tanstack/(react-)?query'],
}

const SCRIPT_EXTENSION = /\.(?:[cm]?[jt]sx?)$/

/**
 * A path with the parts that TypeScript and the bundlers resolve away: the
 * extension, which a specifier can leave out or write as the JS form of a TS
 * file, and the `index` file of a folder.
 */
function modulePath(file: string): string {
  return file.replace(SCRIPT_EXTENSION, '').replace(/[/\\]index$/, '')
}

/**
 * Two halves of one guarantee: client state is findable, and it is only client
 * state. Stores live in files named for what they are, and those files cannot
 * reach the things that would let server data leak into them.
 */
export const storePlacement: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep stores in store files and keep server data out of them',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/store-placement.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          storeFilePattern: { type: 'string' },
          factorySource: { type: 'string' },
          factoryFile: { type: 'string' },
          bannedInStores: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      factoryOutsideStore:
        "The factory from `{{factory}}` may only be used in a store file, a file whose name matches `{{pattern}}`, so every piece of client state has a home that can be found by name. Move this store into a store file beside the feature's main component.",
      serverDataInStore:
        '`{{source}}` cannot be imported into a store file. A store holds client state only: a copy of server data is stale as soon as the query refetches. Read server data from the query in the component that renders it.',
    },
  },
  create(context) {
    const options = optionObject(context.options)
    const storeFilePattern = stringOption(options, 'storeFilePattern', DEFAULTS.storeFilePattern)
    const factorySource = optionalStringOption(options, 'factorySource')
    const factoryFile = optionalStringOption(options, 'factoryFile')
    const factoryModule = factoryFile === undefined ? undefined : modulePath(path.resolve(context.cwd, factoryFile))
    const fileDirectory = path.resolve(context.cwd, path.dirname(context.filename))

    function isFactory(specifier: string): boolean {
      if (specifier === factorySource) return true
      return factoryModule !== undefined && specifier.startsWith('.') && modulePath(path.resolve(fileDirectory, specifier)) === factoryModule
    }
    const bannedInStores = stringsOption(options, 'bannedInStores', DEFAULTS.bannedInStores)
    const isStoreFile = new RegExp(storeFilePattern).test(context.filename)
    const banned = bannedInStores.map((pattern) => new RegExp(pattern))

    return moduleSourceVisitors((source, specifier) => {
      if (!isStoreFile && isFactory(specifier)) {
        context.report({ node: source, messageId: 'factoryOutsideStore', data: { factory: specifier, pattern: storeFilePattern } })
      }
      if (isStoreFile && banned.some((pattern) => pattern.test(specifier))) {
        context.report({ node: source, messageId: 'serverDataInStore', data: { source: specifier } })
      }
    })
  },
}
