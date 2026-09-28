import type { ESTree, Rule } from '@oxlint/plugins'
const EQUALITY = new Set(['===', '!==', '==', '!='])

function isTypeof(node: ESTree.Node): boolean {
  return node.type === 'UnaryExpression' && node.operator === 'typeof'
}

function isObjectLiteral(node: ESTree.Node): boolean {
  return node.type === 'Literal' && node.value === 'object'
}

/**
 * `typeof value === 'object' && value !== null && 'key' in value && …` is a
 * schema spelled out in boolean operators. It is the inline form of the
 * hand-written guard that `no-unknown-type-guards` reports, and it has the same
 * answer: parse the value with a zod schema where it enters the program.
 *
 * Only the comparison with `'object'` is reported, because that is where probing
 * an unknown value starts. `typeof x === 'string'` and its kin usually narrow a
 * union the program already knows, which is ordinary TypeScript.
 */
export const noTypeofObject: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: "Parse unknown data with a schema instead of probing it with typeof … === 'object'",
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-typeof-object.md',
    },
    schema: [],
    messages: {
      typeofObject:
        "`typeof … {{operator}} 'object'` is the first line of validating a value by hand, and the `null` check, the `in` checks and the casts follow it. Describe the shape as a zod schema and parse the value where it enters the program; everything after that holds typed data.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (!EQUALITY.has(node.operator)) return
        const probing = (isTypeof(node.left) && isObjectLiteral(node.right)) || (isTypeof(node.right) && isObjectLiteral(node.left))
        if (probing) context.report({ node, messageId: 'typeofObject', data: { operator: node.operator } })
      },
    }
  },
}
