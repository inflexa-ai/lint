import { TSESLint, type TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { variableFor } from '../helpers/static-names.ts'

const { DefinitionType } = TSESLint.Scope

// The statements a top-level declaration can be, each of which takes `export`
// in front of it and means the same thing exported.
const DECLARATIONS = new Set(['FunctionDeclaration', 'ClassDeclaration', 'VariableDeclaration', 'TSTypeAliasDeclaration', 'TSInterfaceDeclaration', 'TSEnumDeclaration'])

/**
 * The top-level statement that declares a definition, when `export` in front of
 * it would export exactly that name. `undefined` otherwise: a name bound inside
 * a `const a = 1, b = 2` would take its neighbour along, and a name that is not
 * declared at the top of the module has no statement to mark.
 */
function statementOf(def: TSESLint.Scope.Definition): TSESTree.Node | undefined {
  const statement = def.type === DefinitionType.Variable ? def.parent : def.node
  if (!DECLARATIONS.has(statement.type) || statement.parent.type !== AST_NODE_TYPES.Program) return undefined
  if (statement.type === AST_NODE_TYPES.VariableDeclaration && statement.declarations.length !== 1) return undefined
  return statement
}

/**
 * `export { NotFoundPage }` at the foot of a file says, far from the
 * declaration, that the declaration is public. A reader of the function cannot
 * tell whether anything outside the file may call it without scrolling to the
 * end, and the list drifts: a name removed from it leaves a declaration that
 * looks exported and is not, or the reverse. `export` on the declaration puts
 * the answer where the question is asked.
 *
 * `export default Page` is the same list with one entry, and is reported with
 * it. An imported binding has no declaration in the file to mark, and re-exports
 * from its source in one statement: `export { z } from 'zod'`.
 *
 * `export {}` exports nothing and only marks a file as a module, and a
 * re-export with `from` names its source on the line, so both are left alone.
 *
 * The fix moves `export` onto each declaration and deletes the list, which is
 * what makes a copied-in registry component that exports at the foot one
 * `oxlint --fix` away from this repository's form. It declines, and reports
 * only, when a name is renamed on the way out, is imported, or shares its
 * declaration statement with a name the list does not export.
 */
export const exportAtDeclaration: TSESLint.RuleModule<'exportList' | 'reExport' | 'defaultIdentifier'> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Export a declaration where it is declared, not in a list at the foot of the file',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/export-at-declaration.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      exportList:
        '`{{statement}}` says far from the declaration that it is public, so a reader of the declaration cannot tell. Write `export` on the declaration itself, as in `export function {{first}}`.',
      reExport:
        '`{{name}}` is imported, so this file has no declaration of it to mark. Re-export it from where it comes from, in one statement: `export { {{name}} } from {{source}}`.',
      defaultIdentifier:
        '`export default {{name}}` says far from the declaration that it is public. Write `export default` on the declaration itself, or export it by name at its declaration.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** The range that deletes a statement together with the blank space before it. */
    function removalRange(node: TSESTree.Node): TSESLint.AST.Range {
      const before = sourceCode.getTokenBefore(node, { includeComments: true })
      return [before ? before.range[1] : 0, node.range[1]]
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.source || node.declaration) return

        const statements: TSESTree.Node[] = []
        let fixable = true
        for (const specifier of node.specifiers) {
          const local = specifier.local.name
          const variable = variableFor(sourceCode, specifier.local)
          const imported = variable?.defs.find((def) => def.type === DefinitionType.ImportBinding)
          if (imported) {
            const declaration = imported.parent
            // `import x = require('m')` has no `source`: the module string sits
            // in the external reference. A namespace alias has no module to
            // re-export from, so it gets no message, and no list that holds an
            // imported name is fixable, because the alias export cannot move.
            const source =
              declaration.type === AST_NODE_TYPES.TSImportEqualsDeclaration
                ? declaration.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
                  ? declaration.moduleReference.expression
                  : undefined
                : 'source' in declaration
                  ? declaration.source
                  : undefined
            if (source) {
              context.report({ node: specifier, messageId: 'reExport', data: { name: local, source: sourceCode.getText(source) } })
            }
            fixable = false
            continue
          }
          const renamed = specifier.exported.type !== AST_NODE_TYPES.Identifier || specifier.exported.name !== local
          const found = variable?.defs.map(statementOf) ?? []
          const declared = found.filter((statement) => statement !== undefined)
          if (renamed || found.length === 0 || declared.length < found.length) fixable = false
          else statements.push(...declared)
        }

        const locals = node.specifiers.filter((specifier) => !variableFor(sourceCode, specifier.local)?.defs.some((def) => def.type === DefinitionType.ImportBinding))
        if (locals.length === 0) return

        context.report({
          node,
          messageId: 'exportList',
          data: { statement: sourceCode.getText(node), first: locals[0].local.name },
          fix: fixable ? (fixer) => [...new Set(statements)].map((statement) => fixer.insertTextBefore(statement, 'export ')).concat(fixer.removeRange(removalRange(node))) : null,
        })
      },
      ExportDefaultDeclaration(node) {
        if (node.declaration.type !== AST_NODE_TYPES.Identifier) return
        const { name } = node.declaration
        const defs = variableFor(sourceCode, node.declaration)?.defs ?? []
        const [only] = defs
        const declaration =
          defs.length === 1 &&
          (only.node.type === AST_NODE_TYPES.FunctionDeclaration || only.node.type === AST_NODE_TYPES.ClassDeclaration) &&
          only.node.parent.type === AST_NODE_TYPES.Program
            ? only.node
            : undefined

        context.report({
          node,
          messageId: 'defaultIdentifier',
          data: { name },
          fix: declaration ? (fixer) => [fixer.insertTextBefore(declaration, 'export default '), fixer.removeRange(removalRange(node))] : null,
        })
      },
    }
  },
}
