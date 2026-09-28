import { isTypeReferenceNode, type Node, SyntaxKind } from 'typescript/unstable/ast'
import { isObjectType, isUnionType, ObjectFlags, SignatureKind, type Type } from 'typescript/unstable/sync'
import type { RuleModule } from '../rule.ts'

/**
 * `Omit<{ a: string }, 'a'>` and `{ a: 1 } & Record<never, 1>` read as shapes
 * and resolve to `{}`, which accepts every value but `null` and `undefined`.
 * Such a type is almost always a mistake of a type operation, and nothing at
 * the use says so.
 *
 * A port of `no-generated-empty-object-type` of typescript-eslint (MIT) to the
 * API of TypeScript 7. It reads the type of an intersection, and of a type
 * reference with type arguments that is not a member of an intersection.
 */
export const noGeneratedEmptyObjectType: RuleModule = {
  meta: {
    docs: {
      description: 'Disallow type operations that resolve to the "empty object" type',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-generated-empty-object-type.md',
    },
    messages: {
      noGeneratedEmptyObjectType: 'This type resolves to `{}`, the empty object type. This was likely not intentional.',
    },
    defaultOptions: {},
  },
  create(context) {
    const { checker } = context

    function isEmptyObjectType(type: Type): boolean {
      return (
        isObjectType(type) &&
        (type.objectFlags & (ObjectFlags.Class | ObjectFlags.Interface)) === 0 &&
        checker.getPropertiesOfType(type).length === 0 &&
        checker.getIndexInfosOfType(type).length === 0 &&
        checker.getSignaturesOfType(type, SignatureKind.Call).length === 0 &&
        checker.getSignaturesOfType(type, SignatureKind.Construct).length === 0 &&
        // A type that still waits for its type arguments, such as
        // `Record<T, unknown>` in a generic declaration, has no members yet
        // either. Each primitive is assignable to `{}`, and a mapped type whose
        // keys are not resolved, such as `{ [K in Keys<T>]: K }`, accepts
        // `number` but not `string`, thus the two probes tell them apart.
        checker.isTypeAssignableTo(checker.getNumberType(), type) &&
        checker.isTypeAssignableTo(checker.getStringType(), type)
      )
    }

    function check(node: Node): void {
      const type = checker.getTypeAtLocation(node)
      if (type === undefined) return
      if (isEmptyObjectType(type) || (isUnionType(type) && type.getTypes().some(isEmptyObjectType))) {
        context.report({ node, messageId: 'noGeneratedEmptyObjectType' })
      }
    }

    return {
      [SyntaxKind.IntersectionType]: check,
      [SyntaxKind.TypeReference]: (node) => {
        if (!isTypeReferenceNode(node) || node.typeArguments === undefined) return
        // ESTree has no parenthesized type, thus upstream sees the intersection above the parentheses as the parent.
        let parent = node.parent
        while (parent.kind === SyntaxKind.ParenthesizedType) parent = parent.parent
        if (parent.kind !== SyntaxKind.IntersectionType) check(node)
      },
    }
  },
}
