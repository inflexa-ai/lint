import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
// A statement is where the reason for an assertion reads: a person writes the
// invariant above the line, not squeezed inside the expression. The walk up
// from an assertion stops at the nearest of these, and a `SAFETY:` comment
// anywhere between there and the assertion answers for it.
const STATEMENTS = new Set(['ExpressionStatement', 'PropertyDefinition', 'ReturnStatement', 'ThrowStatement', 'VariableDeclaration'])

const SAFETY = /\bSAFETY\s*:/

/** Whether a node asserts to `const`, which widens nothing and states no invariant. */
function isConstAssertion(node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion): boolean {
  return (
    node.typeAnnotation.type === AST_NODE_TYPES.TSTypeReference && node.typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier && node.typeAnnotation.typeName.name === 'const'
  )
}

/**
 * `value as Target` tells the compiler to stop checking and believe the
 * annotation. The dangerous forms are reported elsewhere: `as unknown as T` by
 * `no-double-cast`, and an `as` that narrows a type the compiler cannot follow
 * by `@typescript-eslint/no-unsafe-type-assertion`. What is left is an
 * assertion the compiler accepts, which is sound only because of something the
 * writer knows and the types do not say: a discriminant checked on the line
 * above, a backend contract the program owns, a value the runtime built.
 *
 * That reason is invisible to the next reader, so this rule asks for it in a
 * `SAFETY:` comment on the assertion or the statement that holds it. The one in
 * `create-api-client.ts` states the trust boundary; there is no other in the
 * repository, and there is meant to be none without the invariant beside it.
 *
 * `as const` is left alone: it freezes a literal and widens nothing, so it
 * carries no claim to justify. The comment is asked for once per statement,
 * where a person reads it, rather than crowded against the operator.
 */
export const requireAssertionSafety: TSESLint.RuleModule<'missingSafety'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'State the invariant behind a type assertion in a SAFETY comment',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/require-assertion-safety.md',
    },
    schema: [],
    messages: {
      missingSafety:
        'This `as` tells the compiler to stop checking, and nothing here says why that is sound. State the invariant in a `SAFETY:` comment on this line or the statement that holds it: the check that narrows the value, the contract that guarantees its shape, or the reason the runtime built it. If the value comes from outside the program, parse it with a zod schema instead.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** Whether a `SAFETY:` comment sits before the assertion, up to the statement that owns it. */
    function hasSafety(node: TSESTree.Node): boolean {
      for (let current: TSESTree.Node | undefined = node; current !== undefined; current = current.parent) {
        if (sourceCode.getCommentsBefore(current).some((comment) => comment.range[1] <= node.range[0] && SAFETY.test(comment.value))) return true
        if (STATEMENTS.has(current.type) || current.parent?.type === AST_NODE_TYPES.Program) return false
      }
      return false
    }

    function check(node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion): void {
      if (isConstAssertion(node) || hasSafety(node)) return
      context.report({ node, messageId: 'missingSafety' })
    }

    return { TSAsExpression: check, TSTypeAssertion: check }
  },
}
