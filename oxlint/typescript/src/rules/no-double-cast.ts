import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
const ESCAPE_TYPES = new Set(['TSUnknownKeyword', 'TSAnyKeyword'])

/**
 * `value as unknown as Target` is not a cast, it is an instruction to stop type
 * checking: the compiler refused the direct assertion because the two types
 * have nothing in common, and routing through `unknown` overrules it. Whatever
 * the value really is, every line after this one believes the annotation.
 *
 * There is always something truer to write. Data from outside is parsed by a
 * schema. A wrong declaration is corrected. A test double is built to satisfy
 * the type, or typed as the narrower thing the test needs.
 */
export const noDoubleCast: TSESLint.RuleModule<'doubleCast'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow casting through unknown or any',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-double-cast.md',
    },
    schema: [],
    messages: {
      doubleCast:
        'Casting through `{{via}}` overrules the compiler where it found the two types incompatible, and everything after this line trusts the result. If the value comes from outside the program, parse it with a zod schema. If a declaration is wrong, fix the declaration. In a test, build a value that satisfies the type.',
    },
  },
  create(context) {
    function check(node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion): void {
      const inner = node.expression
      if ((inner.type !== AST_NODE_TYPES.TSAsExpression && inner.type !== AST_NODE_TYPES.TSTypeAssertion) || !ESCAPE_TYPES.has(inner.typeAnnotation.type)) return
      context.report({
        node,
        messageId: 'doubleCast',
        data: { via: inner.typeAnnotation.type === AST_NODE_TYPES.TSAnyKeyword ? 'any' : 'unknown' },
      })
    }

    return { TSAsExpression: check, TSTypeAssertion: check }
  },
}
