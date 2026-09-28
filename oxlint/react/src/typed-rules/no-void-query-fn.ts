import type { RuleModule } from '@inflexa-ai/typecheck'
import { isIdentifier, isMethodDeclaration, isObjectLiteralExpression, isPropertyAssignment, isShorthandPropertyAssignment, type Node, SyntaxKind } from 'typescript/unstable/ast'
import { isUnionType, SignatureKind, type Type, TypeFlags } from 'typescript/unstable/sync'

/** How many `then` steps the promised type of a thenable takes before the rule gives up on it, as a guard against a type that promises itself. */
const MAX_AWAIT_DEPTH = 10

/**
 * The value of a property named `queryFn` of an object literal, in the
 * property, method and shorthand forms, as the `Property` visitor of ESTree
 * sees each of them.
 */
function queryFnOf(node: Node): Node | undefined {
  if (!isObjectLiteralExpression(node.parent)) return undefined
  if (isPropertyAssignment(node)) return isIdentifier(node.name) && node.name.text === 'queryFn' ? node.initializer : undefined
  if (isShorthandPropertyAssignment(node)) return isIdentifier(node.name) && node.name.text === 'queryFn' ? node.name : undefined
  if (isMethodDeclaration(node)) return isIdentifier(node.name) && node.name.text === 'queryFn' ? node : undefined
  return undefined
}

/**
 * A query function that gives no value stores `undefined` in the cache, which
 * TanStack Query refuses at run time: the query fails with an error that no
 * type pointed at.
 *
 * A port of `no-void-query-fn` of `@tanstack/eslint-plugin-query` (MIT) to the
 * API of TypeScript 7.
 */
export const noVoidQueryFn: RuleModule = {
  meta: {
    docs: {
      description: 'Ensures queryFn returns a non-undefined value',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-void-query-fn.md',
    },
    messages: {
      noVoidReturn: 'queryFn must return a non-undefined value',
    },
    defaultOptions: {},
  },
  create(context) {
    const { checker } = context

    /**
     * The type that `await` gives for a type. The API has no `getAwaitedType`,
     * thus this follows the checker: the type of the first parameter of the
     * `onfulfilled` callback of `then`, again while that type is a thenable.
     */
    function awaitedType(type: Type, depth = 0): Type {
      if (depth >= MAX_AWAIT_DEPTH) return type
      const then = checker.getPropertyOfType(type, 'then')
      const thenType = then === undefined ? undefined : checker.getTypeOfSymbol(then)
      const thenSignature = thenType === undefined ? undefined : checker.getSignaturesOfType(thenType, SignatureKind.Call).at(0)
      const onfulfilled = thenSignature === undefined ? undefined : checker.getParameterType(thenSignature, 0)
      const callback = onfulfilled === undefined ? undefined : checker.getNonNullableType(onfulfilled)
      const callbackSignature = callback === undefined ? undefined : checker.getSignaturesOfType(callback, SignatureKind.Call).at(0)
      const value = callbackSignature === undefined ? undefined : checker.getParameterType(callbackSignature, 0)
      return value === undefined ? type : awaitedType(value, depth + 1)
    }

    function isIllegalReturn(type: Type): boolean {
      const awaited = awaitedType(type)
      if (isUnionType(awaited)) return awaited.getTypes().some(isIllegalReturn)
      return (awaited.flags & (TypeFlags.Void | TypeFlags.Undefined)) !== 0
    }

    function check(node: Node): void {
      const value = queryFnOf(node)
      if (value === undefined) return
      const type = checker.getTypeAtLocation(value)
      const signature = type === undefined ? undefined : checker.getSignaturesOfType(type, SignatureKind.Call).at(0)
      const returnType = signature === undefined ? undefined : checker.getReturnTypeOfSignature(signature)
      if (returnType !== undefined && isIllegalReturn(returnType)) context.report({ node: value, messageId: 'noVoidReturn' })
    }

    return { [SyntaxKind.PropertyAssignment]: check, [SyntaxKind.ShorthandPropertyAssignment]: check, [SyntaxKind.MethodDeclaration]: check }
  },
}
