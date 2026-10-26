import type { ESTree, Rule } from '@oxlint/plugins'
import { isGlobalIdentifier, variableFor } from '../helpers/static-names.ts'

const EQUALITY = new Set(['===', '!==', '==', '!='])

function isTypeof(node: ESTree.Node): boolean {
  return node.type === 'UnaryExpression' && node.operator === 'typeof'
}

function isObjectLiteral(node: ESTree.Node | null): boolean {
  return node?.type === 'Literal' && node.value === 'object'
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
 *
 * The other spellings of the same probe are reported with it: a `case 'object'`
 * of a `switch` on `typeof`, a `const` that holds the `typeof` and is compared
 * later, `instanceof Object`, and `Object(value) === value`.
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
      objectProbe:
        '`{{form}}` asks whether a value is an object, which is the first line of validating it by hand. Describe the shape as a zod schema and parse the value where it enters the program; everything after that holds typed data.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** Whether the node is `typeof x`, or a `const` whose initializer is one. */
    function readsTypeof(node: ESTree.Node): boolean {
      if (isTypeof(node)) return true
      if (node.type !== 'Identifier') return false
      return (variableFor(sourceCode, node)?.defs ?? []).some(
        (def) =>
          def.node.type === 'VariableDeclarator' && def.parent?.type === 'VariableDeclaration' && def.parent.kind === 'const' && def.node.init !== null && isTypeof(def.node.init),
      )
    }

    function isGlobalObject(node: ESTree.Node): boolean {
      return node.type === 'Identifier' && node.name === 'Object' && isGlobalIdentifier(sourceCode, node)
    }

    /** `Object(value)` beside the same `value`, compared by its source text. */
    function isObjectWrapOf(call: ESTree.Node, value: ESTree.Node): boolean {
      if (call.type !== 'CallExpression' || !isGlobalObject(call.callee) || call.arguments.length !== 1) return false
      return sourceCode.getText(call.arguments[0]) === sourceCode.getText(value)
    }

    return {
      BinaryExpression(node) {
        if (node.operator === 'instanceof' && isGlobalObject(node.right)) {
          context.report({ node, messageId: 'objectProbe', data: { form: 'instanceof Object' } })
          return
        }
        if (!EQUALITY.has(node.operator)) return
        const probing = (readsTypeof(node.left) && isObjectLiteral(node.right)) || (readsTypeof(node.right) && isObjectLiteral(node.left))
        if (probing) {
          context.report({ node, messageId: 'typeofObject', data: { operator: node.operator } })
        } else if (isObjectWrapOf(node.left, node.right) || isObjectWrapOf(node.right, node.left)) {
          context.report({ node, messageId: 'objectProbe', data: { form: `Object(value) ${node.operator} value` } })
        }
      },
      SwitchStatement(node) {
        if (!readsTypeof(node.discriminant)) return
        for (const switchCase of node.cases) {
          if (isObjectLiteral(switchCase.test)) context.report({ node: switchCase, messageId: 'objectProbe', data: { form: "case 'object'" } })
        }
      },
    }
  },
}
