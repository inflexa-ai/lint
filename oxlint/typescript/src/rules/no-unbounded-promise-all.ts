import type { ESTree, Rule } from '@oxlint/plugins'
import { optionObject, stringOption } from '../helpers/rule-options.ts'
import { staticMemberName } from '../helpers/static-names.ts'

const COMBINATORS = new Set(['all', 'allSettled', 'any', 'race'])

const MAPPERS = new Set(['map', 'flatMap'])

const DEFAULT_HINT = 'Run the calls through a queue of fixed width: the `mapWithLimit` function of the document of this rule, or a library such as `p-limit`.'

function unwrap(node: ESTree.Node): ESTree.Node {
  let current = node
  while (current.type === 'TSAsExpression' || current.type === 'TSSatisfiesExpression' || current.type === 'TSNonNullExpression' || current.type === 'TSTypeAssertion') {
    current = current.expression
  }
  return current
}

/** Whether the node names the global `Promise`, bare or through `globalThis`. */
function isPromise(node: ESTree.Node): boolean {
  if (node.type === 'Identifier') return node.name === 'Promise'
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'globalThis' && staticMemberName(node) === 'Promise'
}

/** `{ length: width }`, the source of `Array.from` that a pool of workers uses: its size is the width, not the input. */
function isSizedByLength(node: ESTree.Node): boolean {
  return (
    node.type === 'ObjectExpression' && node.properties.some((property) => property.type === 'Property' && property.key.type === 'Identifier' && property.key.name === 'length')
  )
}

/** The name of the call that starts one promise for each element of an input, or `undefined`. */
function fanOutOf(node: ESTree.Node): string | undefined {
  const call = unwrap(node)
  if (call.type !== 'CallExpression' || call.callee.type !== 'MemberExpression') return undefined
  const name = staticMemberName(call.callee)
  const receiver = unwrap(call.callee.object)
  if (name !== undefined && MAPPERS.has(name)) return receiver.type === 'ArrayExpression' ? undefined : name
  const [source] = call.arguments
  if (name !== 'from' || receiver.type !== 'Identifier' || receiver.name !== 'Array' || call.arguments.length < 2) return undefined
  return isSizedByLength(unwrap(source)) ? undefined : 'Array.from'
}

/**
 * `Promise.all(items.map(fetchOne))` starts every call at the same moment: a
 * thousand items are a thousand open requests, and the server, the pool of
 * connections or the rate limit fails first. The limit that the code needs is
 * a number of calls in flight, which only a queue of fixed width gives.
 *
 * A literal array of calls is left alone, because its size is in the code. So
 * is `Array.from({ length: width }, work)`, the start of a pool of workers,
 * whose size is the width of the pool.
 */
export const noUnboundedPromiseAll: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Run one call for each element through a queue of fixed width, not through Promise.all',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-unbounded-promise-all.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // The queue this repository offers, which a shared rule cannot name.
          hint: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ hint: DEFAULT_HINT }],
    messages: {
      unbounded:
        '`Promise.{{combinator}}` over `{{fanOut}}` starts one call for each element at the same moment, and nothing limits how many run. The input size is the count of calls in flight. {{hint}}',
    },
  },
  create(context) {
    const hint = stringOption(optionObject(context.options), 'hint', DEFAULT_HINT)

    return {
      CallExpression(call) {
        if (call.callee.type !== 'MemberExpression' || !isPromise(unwrap(call.callee.object))) return
        const combinator = staticMemberName(call.callee)
        if (combinator === undefined || !COMBINATORS.has(combinator)) return
        if (call.arguments.length === 0) return
        const [argument] = call.arguments

        const input = unwrap(argument)
        const candidates = input.type === 'ArrayExpression' ? input.elements.flatMap((element) => (element?.type === 'SpreadElement' ? [element.argument] : [])) : [input]
        for (const candidate of candidates) {
          const fanOut = fanOutOf(candidate)
          if (fanOut !== undefined) context.report({ node: call, messageId: 'unbounded', data: { combinator, fanOut, hint } })
        }
      },
    }
  },
}
