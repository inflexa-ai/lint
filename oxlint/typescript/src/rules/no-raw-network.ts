import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { globalReadOf } from '../helpers/static-names.ts'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { globals: string[]; navigatorMethods: string[]; hint: string }

const DEFAULTS: Options = {
  globals: ['fetch', 'XMLHttpRequest', 'EventSource', 'WebSocket'],
  navigatorMethods: ['sendBeacon'],
  hint: '',
}

/**
 * Every request an app makes goes through an API client, so authentication,
 * error shape, cancellation and the sign-out path exist once. A stray `fetch`
 * is how a second, slightly different copy of all four gets started.
 *
 * Only true globals are reported. A parameter, import or local named `fetch`
 * (the injected fetch of the API client itself, for one) is someone's own
 * binding and is left alone, and so is a `window` or a `navigator` that a file
 * declares for itself: both halves ask the scope which binding a name resolves
 * to rather than reading the name.
 *
 * A qualified spelling names the same global, so `globalThis.fetch` and
 * `window.navigator.sendBeacon` are the same finding as the bare form, at any
 * depth of qualification. The global copied into a variable first is not
 * followed: `const g = globalThis` is not a shape anyone writes, and the
 * reference that copies `fetch` itself is already reported where it is made.
 */
export const noRawNetwork: TSESLint.RuleModule<'rawNetwork', [Partial<Options>]> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Route network access through an API client',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-raw-network.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          globals: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          navigatorMethods: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          // The client this repository offers, which a shared rule cannot name.
          hint: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      rawNetwork:
        '`{{name}}` is not available here. Network access goes through the API client of this repository, so authentication, errors, cancellation and sign-out exist once. For a stream, a download or a library that takes a `fetch`, use the `fetch` of the client.{{hint}}',
    },
  },
  create(context) {
    const { globals, navigatorMethods, hint } = { ...DEFAULTS, ...context.options[0] }
    const hintText = hint ? ` ${hint}` : ''
    const bannedGlobals = new Set(globals)
    // A navigator method is named from the object it hangs off, which is the
    // name `globalReadOf` gives it whatever the call was qualified with.
    const banned = new Set([...globals, ...navigatorMethods.map((method) => `navigator.${method}`)])

    function report(node: TSESTree.Node, name: string): void {
      context.report({ node, messageId: 'rawNetwork', data: { name, hint: hintText } })
    }

    function reportReference(reference: TSESLint.Scope.Reference): void {
      // `typeof fetch` in a type position names the type, it does not call anything.
      if (reference.identifier.parent.type === AST_NODE_TYPES.TSTypeQuery) return
      report(reference.identifier, reference.identifier.name)
    }

    return {
      'Program:exit'(program) {
        const globalScope = context.sourceCode.getScope(program)

        // Declared globals (the config's browser globals) resolve to a variable
        // with no definition in this file; undeclared ones fall through unresolved.
        for (const variable of globalScope.variables) {
          if (!bannedGlobals.has(variable.name) || variable.defs.length > 0) continue
          for (const reference of variable.references) reportReference(reference)
        }
        for (const reference of globalScope.through) {
          if (bannedGlobals.has(reference.identifier.name)) reportReference(reference)
        }
      },
      MemberExpression(node) {
        const read = globalReadOf(context.sourceCode, node)
        // The message shows the spelling the reader will find in the file, and
        // the decision is made on what that spelling names.
        if (read !== undefined && banned.has(read.name)) report(node, read.path)
      },
    }
  },
}
