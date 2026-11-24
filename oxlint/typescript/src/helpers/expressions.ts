import type { ESTree } from '@oxlint/plugins'

/** The value under `as`, `satisfies`, `!` and `<T>`, each of which changes the type and keeps the value. */
export function unwrapTypeAssertions<T extends ESTree.Node>(node: T): T | ESTree.Expression {
  let current: T | ESTree.Expression = node
  while (current.type === 'TSAsExpression' || current.type === 'TSSatisfiesExpression' || current.type === 'TSNonNullExpression' || current.type === 'TSTypeAssertion') {
    current = current.expression
  }
  return current
}
