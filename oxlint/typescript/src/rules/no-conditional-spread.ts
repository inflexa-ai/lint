import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

const isTypeWrapper = (node: TSESTree.Node) =>
  node.type === AST_NODE_TYPES.TSAsExpression ||
  node.type === AST_NODE_TYPES.TSSatisfiesExpression ||
  node.type === AST_NODE_TYPES.TSNonNullExpression ||
  node.type === AST_NODE_TYPES.TSTypeAssertion

function unwrap(node: TSESTree.Expression): TSESTree.Expression {
  let current = node
  while (isTypeWrapper(current)) current = current.expression
  return current
}

function isEmptyObject(node: TSESTree.Node): boolean {
  return node.type === AST_NODE_TYPES.ObjectExpression && node.properties.length === 0
}

function isNothing(node: TSESTree.Node): boolean {
  return isEmptyObject(node) || (node.type === AST_NODE_TYPES.Identifier && node.name === 'undefined') || (node.type === AST_NODE_TYPES.Literal && node.value === null)
}

/**
 * `...(value === undefined ? {} : { key: value })` is a property assignment
 * written as a puzzle: the reader has to evaluate a ternary and two object
 * literals to learn that `key` is set when `value` exists. It spreads through
 * a codebase because it always type-checks and never looks wrong in isolation.
 *
 * Almost every instance exists only to keep an `undefined` out of an object,
 * which matters only under `exactOptionalPropertyTypes`. That flag stays off
 * here so that a missing key and an `undefined` one mean the same, which makes
 * the direct form `{ key: value }` correct. The rare object whose key really
 * must be absent (a `Headers` init, a JSON body a server validates strictly) is
 * clearer as a named variable with the key added in an `if`.
 *
 * Array spreads are left alone: `[...(condition ? [item] : [])]` has no direct
 * form to fall back on.
 */
export const noConditionalSpread: TSESLint.RuleModule<'conditional' | 'emptyFallback'> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Write a property directly instead of spreading a conditional object',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-conditional-spread.md',
    },
    schema: [],
    messages: {
      conditional:
        'A conditional spread hides a plain property assignment.{{direct}} Writing the property directly is correct when its value may be `undefined`: `exactOptionalPropertyTypes` is off here, so a missing key and an `undefined` one mean the same. When the key truly must be absent, build the object in a named variable and add the key inside an `if`.',
      emptyFallback: 'Spreading `undefined` or `null` into an object is already a no-op, so the `{{operator}} {}` fallback does nothing. Spread the value itself.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** The inside of the object literal the conditional would spread, when there is exactly one and it is short. */
    function directForm(branches: TSESTree.Expression[]): string {
      const objects = branches.map(unwrap)
      const filled = objects.filter((branch) => branch.type === AST_NODE_TYPES.ObjectExpression).filter((object) => object.properties.length > 0)
      if (filled.length !== 1 || !objects.every((branch) => branch === filled[0] || isNothing(branch))) return ''

      const { properties } = filled[0]
      const [first] = properties
      const last = properties[properties.length - 1]
      const text = sourceCode.text.slice(first.range[0], last.range[1])
      return text.length <= 80 && !text.includes('\n') ? ` Here that is \`${text}\`.` : ''
    }

    function check(spread: TSESTree.SpreadElement | TSESTree.JSXSpreadAttribute): void {
      const argument = unwrap(spread.argument)

      if (argument.type === AST_NODE_TYPES.ConditionalExpression) {
        context.report({
          node: spread,
          messageId: 'conditional',
          data: { direct: directForm([argument.consequent, argument.alternate]) },
        })
        return
      }

      if (argument.type !== AST_NODE_TYPES.LogicalExpression) return

      if (argument.operator === '&&') {
        context.report({ node: spread, messageId: 'conditional', data: { direct: directForm([argument.right]) } })
      } else if (isEmptyObject(unwrap(argument.right))) {
        context.report({ node: spread, messageId: 'emptyFallback', data: { operator: argument.operator } })
      }
    }

    return {
      // Only inside an object literal: the same node type also spreads into
      // arrays and call arguments, where there is no property to write instead.
      'ObjectExpression > SpreadElement': check,
      JSXSpreadAttribute: check,
    }
  },
}
