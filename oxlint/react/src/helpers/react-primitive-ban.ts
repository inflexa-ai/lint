import { exportedName, staticMemberName } from '@inflexa-ai/oxlint-plugin/helpers/static-names'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

/** The options of a ban, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { names: string[]; hint: string }

/** The rule that `createReactPrimitiveBan` builds. */
export type ReactPrimitiveBan = TSESLint.RuleModule<'banned' | 'reexportAll', [Partial<Options>]>

/**
 * Builds a rule that reports every way a file can get hold of the named
 * exports of `react`: a named import (aliased or not), a re-export, member
 * access on the default or namespace import, and destructuring that import.
 *
 * Banning the import rather than the call is what closes the loopholes: an
 * aliased import, `React.useEffect`, and the sibling primitives that do the
 * same job (`useLayoutEffect` for `useEffect`) are all the same violation.
 * Because the import is the subject, a rename and a namespace import are
 * covered by the shape of the rule rather than by a list of spellings, and the
 * name a call is written under never matters.
 *
 * Two ways of holding react are out of reach and stay that way. The namespace
 * copied into a second variable, `const R = React`, would need the assignments
 * followed, and no file is written that way. `await import('react')` hands the
 * module out at runtime, and lazily loading react itself inside an app that is
 * already rendering is not a thing anyone does.
 */
export function createReactPrimitiveBan({ description, names, guidance, url }: { description: string; names: string[]; guidance: string; url: string }): ReactPrimitiveBan {
  const defaults: Options = { names, hint: '' }
  return {
    meta: {
      type: 'problem',
      docs: { description, url },
      schema: [
        {
          type: 'object',
          properties: {
            names: { type: 'array', items: { type: 'string' }, uniqueItems: true },
            // The replacement this repository offers, which a shared rule cannot name.
            hint: { type: 'string' },
          },
          additionalProperties: false,
        },
      ],
      defaultOptions: [defaults],
      messages: {
        banned: `\`{{name}}\` from react is not available here. ${guidance}{{hint}}`,
        reexportAll: 'Re-exporting everything from react hands out the primitives this rule bans. Export the specific names instead.',
      },
    },
    create(context) {
      const options = { ...defaults, ...context.options[0] }
      const banned = new Set(options.names)
      const { hint } = options
      const hintText = hint ? ` ${hint}` : ''
      // Local identifiers bound to the whole react module (`React`, `* as R`).
      const reactBindings = new Set<string>()

      function report(node: TSESTree.Node, name: string): void {
        context.report({ node, messageId: 'banned', data: { name, hint: hintText } })
      }

      return {
        Program(program) {
          // Collected up front so member access is caught wherever the import sits.
          for (const statement of program.body) {
            if (statement.type !== AST_NODE_TYPES.ImportDeclaration || statement.source.value !== 'react') continue
            for (const specifier of statement.specifiers) {
              if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) reactBindings.add(specifier.local.name)
            }
          }
        },
        ImportDeclaration(node) {
          if (node.source.value !== 'react' || node.importKind === 'type') return
          for (const specifier of node.specifiers) {
            if (specifier.type !== AST_NODE_TYPES.ImportSpecifier || specifier.importKind === 'type') continue
            const name = exportedName(specifier.imported)
            if (banned.has(name)) report(specifier, name)
          }
        },
        ExportNamedDeclaration(node) {
          if (node.source?.value !== 'react' || node.exportKind === 'type') return
          for (const specifier of node.specifiers) {
            const name = exportedName(specifier.local)
            if (banned.has(name)) report(specifier, name)
          }
        },
        ExportAllDeclaration(node) {
          if (node.source.value === 'react' && node.exportKind !== 'type') {
            context.report({ node, messageId: 'reexportAll' })
          }
        },
        MemberExpression(node) {
          if (node.object.type !== AST_NODE_TYPES.Identifier || !reactBindings.has(node.object.name)) return
          const name = staticMemberName(node)
          if (name !== undefined && banned.has(name)) report(node.property, name)
        },
        VariableDeclarator(node) {
          if (node.id.type !== AST_NODE_TYPES.ObjectPattern || node.init?.type !== AST_NODE_TYPES.Identifier) return
          if (!reactBindings.has(node.init.name)) return
          for (const property of node.id.properties) {
            if (property.type !== AST_NODE_TYPES.Property || property.computed) continue
            const name = exportedName(property.key)
            if (banned.has(name)) report(property, name)
          }
        },
      }
    },
  }
}
