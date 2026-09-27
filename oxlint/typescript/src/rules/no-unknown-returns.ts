import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { bareReferenceName, collectTypeAliases, enclosingTypeParameterNames, FUNCTIONS, type FunctionLike } from '../helpers/type-annotations.ts'

const AWAITABLES = new Set(['Promise', 'PromiseLike'])

/**
 * A function whose declared return type is `unknown` hands the caller a value
 * it cannot read without narrowing, which pushes the parsing outward to every
 * call site. `Promise<unknown>` is the same contract behind an `await`, and a
 * name that resolves to `unknown` is that contract wearing an alias. The place
 * to turn an unknown value into a domain type is the boundary it entered, with
 * a zod schema, so a function returns the type the schema proved.
 *
 * A generic parameter is not followed: a function that returns `T` says nothing
 * about `unknown` even where a caller later picks `unknown` for `T`. Only the
 * aliases of the same file are followed; a name from another file is left
 * alone, because reading one file cannot see what it means.
 */
export const noUnknownReturns: TSESLint.RuleModule<'unknownReturn'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Return a parsed domain type, not unknown',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-unknown-returns.md',
    },
    schema: [],
    messages: {
      unknownReturn:
        'This function returns `unknown`, which every caller has to narrow before it can read the value. Return the type it has once it is parsed. Data whose shape is not known is parsed with a zod schema at the boundary it enters, and `z.infer` gives the type to return.',
    },
  },
  create(context) {
    let aliases = new Map<string, TSESTree.TSTypeAliasDeclaration>()

    /** Whether a written return type is `unknown` once unions, `Promise<>` and this file's aliases are followed. */
    function resolvesToUnknown(type: TSESTree.TypeNode, shadowed: Set<string>, visited = new Set<string>()): boolean {
      if (type.type === AST_NODE_TYPES.TSUnknownKeyword) return true
      if (type.type === AST_NODE_TYPES.TSUnionType) return type.types.some((member) => resolvesToUnknown(member, shadowed, visited))
      if (type.type === AST_NODE_TYPES.TSTypeReference && type.typeName.type === AST_NODE_TYPES.Identifier && AWAITABLES.has(type.typeName.name)) {
        const value = type.typeArguments?.params[0]
        return value !== undefined && resolvesToUnknown(value, shadowed, visited)
      }
      const name = bareReferenceName(type)
      if (name === undefined || shadowed.has(name) || visited.has(name)) return false
      const alias = aliases.get(name)
      if (alias === undefined || alias.typeParameters) return false
      return resolvesToUnknown(alias.typeAnnotation, shadowed, new Set([...visited, name]))
    }

    function check(node: FunctionLike): void {
      const annotation = node.returnType
      if (annotation === undefined) return
      if (!resolvesToUnknown(annotation.typeAnnotation, enclosingTypeParameterNames(node))) return
      context.report({ node: annotation.typeAnnotation, messageId: 'unknownReturn' })
    }

    return {
      Program(node) {
        aliases = collectTypeAliases(node)
      },
      ...Object.fromEntries(FUNCTIONS.map((type) => [type, check])),
    }
  },
}
