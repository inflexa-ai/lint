import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
/** Where a later declaration of the same name is meant to merge into the first. */
function isMergeHome(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.TSModuleDeclaration || !node.declare) return false
  // An augmented module is named by a string. `declare module Foo` is a
  // namespace written with the other keyword, and a namespace is no reason to
  // reach for `interface`.
  return node.kind === 'global' || (node.kind === 'module' && node.id.type === AST_NODE_TYPES.Literal)
}

/**
 * An object shape is declared with `type`. A second `interface` of the same
 * name merges into the first instead of being reported as a duplicate, and
 * `type` also expresses unions, mapped and conditional types, so one keyword
 * covers every shape a program has.
 *
 * Merging is the one thing `interface` does that `type` cannot, and it is the
 * whole point inside `declare module '…'` and `declare global`, so those are
 * the homes this rule leaves alone. Anything nested in one of them is covered
 * too: `declare global { namespace NodeJS { interface ProcessEnv { … } } }` is
 * how `process.env` gets its keys. A top-level `declare namespace Foo` is not a
 * home, because nothing there is being merged into.
 *
 * `@typescript-eslint/consistent-type-definitions` with 'type' is not that
 * rule: it reports an `interface` inside `declare module 'x'` and its autofix
 * rewrites it to a type alias, which leaves the augmentation in place while
 * silently no longer merging. It withholds the fix inside `declare global`
 * only; `isCurrentlyTraversedNodeWithinModuleDeclaration` tests
 * `node.kind === 'global'`. Module augmentation is certain here — TanStack
 * Router takes the router's type through
 * `declare module '@tanstack/react-router' { interface Register { … } }` —
 * and the alternative is an inline disable on every augmentation, which is the
 * form of exception that gets copied into the next file.
 *
 * Nothing is fixed automatically: the direct form of `interface A extends B`
 * is an intersection, which the message spells out.
 */
export const noInterface: TSESLint.RuleModule<'interfaceDeclaration'> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Declare object shapes with `type`, and keep `interface` for declaration merging',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-interface.md',
    },
    schema: [],
    messages: {
      interfaceDeclaration:
        "Declare this shape as a type alias: `type Props = { … }`, and `type A = B & { … }` where an interface extends another. A second `interface` of the same name merges into this one instead of being reported as a duplicate, and `type` also expresses unions, mapped and conditional types, so one keyword covers every shape. `interface` belongs inside `declare module '…'` or `declare global`, where that merging is the purpose.",
    },
  },
  create(context) {
    return {
      TSInterfaceDeclaration(node) {
        if (context.sourceCode.getAncestors(node).some(isMergeHome)) return
        // The name rather than the whole declaration, whose body can run long:
        // the keyword is the violation, not any line of the shape itself.
        context.report({ node: node.id, messageId: 'interfaceDeclaration' })
      },
    }
  },
}
