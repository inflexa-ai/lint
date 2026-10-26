import type { ESTree, Rule } from '@oxlint/plugins'
import { staticMemberName, variableFor } from '../helpers/static-names.ts'

function unwrap(node: ESTree.Expression): ESTree.Expression {
  let current = node
  while (current.type === 'TSAsExpression' || current.type === 'TSSatisfiesExpression' || current.type === 'TSNonNullExpression' || current.type === 'TSTypeAssertion') {
    current = current.expression
  }
  return current
}

function isEmptyObject(node: ESTree.Node): boolean {
  return node.type === 'ObjectExpression' && node.properties.length === 0
}

function isNothing(node: ESTree.Node): boolean {
  return isEmptyObject(node) || (node.type === 'Identifier' && node.name === 'undefined') || (node.type === 'Literal' && node.value === null)
}

/**
 * `...(value === undefined ? {} : { key: value })` is a property assignment
 * written as a puzzle: the reader has to evaluate a ternary and two object
 * literals to learn that `key` is set when `value` exists. It spreads through
 * a codebase because it always type-checks and never looks wrong in isolation.
 *
 * Almost every instance exists only to keep an `undefined` out of an object,
 * which matters only under `exactOptionalPropertyTypes`. Without that flag a
 * missing key and an `undefined` one mean the same, which makes the direct form
 * `{ key: value }` correct. The rare object whose key really
 * must be absent (a `Headers` init, a JSON body a server validates strictly) is
 * clearer as a named variable with the key added in an `if`.
 *
 * `condition ? base : { ...base, key: value }` is the same assignment with the
 * spread moved out to the branches, which is where code goes once the spread is
 * banned. It copies `base` a second time to add one key, and it still reads as
 * a puzzle, thus the rule reports it with the same advice.
 *
 * The same conditional moved into a `const` above the spread, and passed as a
 * source of `Object.assign`, is reported with it.
 *
 * Array spreads are left alone: `[...(condition ? [item] : [])]` has no direct
 * form to fall back on.
 */
export const noConditionalSpread: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Write a property directly instead of spreading a conditional object',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-conditional-spread.md',
    },
    schema: [],
    messages: {
      conditional:
        'A conditional spread hides a plain property assignment.{{direct}} Writing the property directly is correct when its value may be `undefined` and `exactOptionalPropertyTypes` is off, because then a missing key and an `undefined` one mean the same. When the key truly must be absent, build the object in a named variable and add the key inside an `if`.',
      copiedBase:
        'Both branches copy `{{base}}`, and one of them adds {{added}}: a conditional property written as two objects. Write the property directly when its value may be `undefined` and `exactOptionalPropertyTypes` is off. When the key truly must be absent, build the object in a named variable and add the key inside an `if`.',
      emptyFallback: 'Spreading `undefined` or `null` into an object is already a no-op, so the `{{operator}} {}` fallback does nothing. Spread the value itself.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** The inside of the object literal the conditional would spread, when there is exactly one and it is short. */
    function directForm(branches: ESTree.Expression[]): string {
      const objects = branches.map(unwrap)
      const filled = objects.filter((branch) => branch.type === 'ObjectExpression').filter((object) => object.properties.length > 0)
      if (filled.length !== 1 || !objects.every((branch) => branch === filled[0] || isNothing(branch))) return ''

      const { properties } = filled[0]
      const [first] = properties
      const last = properties[properties.length - 1]
      const text = sourceCode.text.slice(first.range[0], last.range[1])
      return text.length <= 80 && !text.includes('\n') ? ` Here that is \`${text}\`.` : ''
    }

    /** The object a branch starts from and the properties it adds, or `undefined` for a branch that copies nothing. */
    function extensionOf(branch: ESTree.Expression): { base: string; added: string[] } | undefined {
      const node = unwrap(branch)
      if (node.type === 'Identifier' || node.type === 'MemberExpression') return { base: sourceCode.getText(node), added: [] }
      if (node.type !== 'ObjectExpression') return undefined
      const [first, ...rest] = node.properties
      if (node.properties.length === 0 || first.type !== 'SpreadElement') return undefined
      return { base: sourceCode.getText(unwrap(first.argument)), added: rest.map((property) => sourceCode.getText(property)) }
    }

    /** Whether the conditional is the argument of a spread that `check` already reports. */
    function isSpreadArgument(conditional: ESTree.ConditionalExpression): boolean {
      let parent = conditional.parent
      while (parent.type === 'TSAsExpression' || parent.type === 'TSSatisfiesExpression' || parent.type === 'TSNonNullExpression' || parent.type === 'TSTypeAssertion')
        parent = parent.parent
      return parent.type === 'JSXSpreadAttribute' || (parent.type === 'SpreadElement' && parent.parent.type === 'ObjectExpression')
    }

    function checkTernary(conditional: ESTree.ConditionalExpression): void {
      if (isSpreadArgument(conditional)) return
      const one = extensionOf(conditional.consequent)
      const other = extensionOf(conditional.alternate)
      if (one === undefined || other === undefined || one.base !== other.base) return
      const [smaller, larger] = one.added.length <= other.added.length ? [one, other] : [other, one]
      const shared = new Set(smaller.added)
      const present = new Set(larger.added)
      const extra = larger.added.filter((property) => !shared.has(property))
      if (extra.length === 0 || !smaller.added.every((property) => present.has(property))) return
      context.report({
        node: conditional,
        messageId: 'copiedBase',
        data: { base: one.base, added: extra.map((property) => `\`${property}\``).join(', ') },
      })
    }

    /** Reports a conditional object that `node` copies into another object. */
    function checkCopied(node: ESTree.Node, value: ESTree.Expression): void {
      const argument = unwrap(value)

      if (argument.type === 'ConditionalExpression') {
        context.report({ node, messageId: 'conditional', data: { direct: directForm([argument.consequent, argument.alternate]) } })
        return
      }

      if (argument.type !== 'LogicalExpression') return

      if (argument.operator === '&&') {
        context.report({ node, messageId: 'conditional', data: { direct: directForm([argument.right]) } })
      } else if (isEmptyObject(unwrap(argument.right))) {
        context.report({ node, messageId: 'emptyFallback', data: { operator: argument.operator } })
      }
    }

    /** Whether a value sets its properties under a condition: one branch is an object and the other is nothing. */
    function isConditionalObject(value: ESTree.Expression): boolean {
      const node = unwrap(value)
      if (node.type === 'ConditionalExpression') {
        const branches = [unwrap(node.consequent), unwrap(node.alternate)]
        return branches.some((branch) => branch.type === 'ObjectExpression') && branches.some((branch) => isNothing(branch))
      }
      return node.type === 'LogicalExpression' && node.operator === '&&' && unwrap(node.right).type === 'ObjectExpression'
    }

    /** The initializer of the `const` that an identifier names, when it is a conditional object. */
    function hoistedConditional(identifier: ESTree.IdentifierReference): ESTree.Expression | undefined {
      for (const def of variableFor(sourceCode, identifier)?.defs ?? []) {
        if (def.node.type !== 'VariableDeclarator' || def.parent?.type !== 'VariableDeclaration' || def.parent.kind !== 'const') continue
        const { init } = def.node
        if (init !== null && isConditionalObject(init)) return init
      }
      return undefined
    }

    function check(spread: ESTree.SpreadElement | ESTree.JSXSpreadAttribute): void {
      const argument = unwrap(spread.argument)
      // The same conditional, moved into a `const` one line above the spread.
      const hoisted = argument.type === 'Identifier' ? hoistedConditional(argument) : undefined
      checkCopied(spread, hoisted ?? spread.argument)
    }

    /** `Object.assign(target, …sources)` copies each source the way a spread does. */
    function checkAssign(call: ESTree.CallExpression): void {
      const { callee } = call
      if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier' || callee.object.name !== 'Object' || staticMemberName(callee) !== 'assign') return
      for (const source of call.arguments.slice(1)) {
        if (source.type !== 'SpreadElement' && isConditionalObject(source)) checkCopied(source, source)
      }
    }

    return {
      // Only inside an object literal: the same node type also spreads into
      // arrays and call arguments, where there is no property to write instead.
      'ObjectExpression > SpreadElement': check,
      JSXSpreadAttribute: check,
      ConditionalExpression: checkTernary,
      CallExpression: checkAssign,
    }
  },
}
