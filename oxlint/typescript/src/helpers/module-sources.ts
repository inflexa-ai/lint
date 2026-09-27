import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

/**
 * The module a specifier node names, or `undefined` where the specifier is
 * built from a value and no reading of the source settles which module it is.
 *
 * A template with nothing substituted into it is a specifier written out in
 * full: TypeScript resolves `import(`zustand`)` to the same module as the
 * string form, and so does every bundler. A rule that read the string alone
 * would leave a working spelling of the import open.
 */
function specifierOf(node: TSESTree.Expression): string | undefined {
  if (node.type === AST_NODE_TYPES.Literal) return typeof node.value === 'string' ? node.value : undefined
  if (node.type !== AST_NODE_TYPES.TemplateLiteral || node.expressions.length > 0) return undefined
  return node.quasis[0]?.value.cooked ?? undefined
}

/**
 * Visitors that call `check` for every module a file names: static imports,
 * re-exports, and dynamic `import()` of a specifier written out. Rules that
 * restrict what a file may depend on share this so that a re-export or a lazy
 * import is never a way around them.
 *
 * The specifier is handed over beside the node that holds it, because the node
 * is where a report belongs and the string is what a rule decides on.
 *
 * `import('lib' + name)` is not covered: the module is chosen while the program
 * runs, and a specifier assembled from pieces is a shape that appears only when
 * somebody is working around one of these rules.
 */
export function moduleSourceVisitors(check: (source: TSESTree.Node, specifier: string) => void): TSESLint.RuleListener {
  function checkSource(source: TSESTree.Expression): void {
    const specifier = specifierOf(source)
    if (specifier !== undefined) check(source, specifier)
  }

  return {
    ImportDeclaration(node) {
      checkSource(node.source)
    },
    ExportNamedDeclaration(node) {
      if (node.source) checkSource(node.source)
    },
    ExportAllDeclaration(node) {
      checkSource(node.source)
    },
    ImportExpression(node) {
      checkSource(node.source)
    },
  }
}
