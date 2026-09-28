import { AST_NODE_TYPES, TSESLint } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'
import { exportedName, staticMemberName, variableFor } from './static-names.ts'

/** The options of a ban, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { names: string[]; hint: string }

/** The rule that `createPrimitiveBan` builds. */
export type PrimitiveBan = TSESLint.RuleModule<'banned' | 'reexportAll', [Partial<Options>]>

/**
 * Builds a rule that reports every way a file can get hold of the named
 * exports of the module: a named import (aliased or not), a re-export, member
 * access on the default or namespace import, and destructuring that import.
 *
 * Banning the import rather than the call is what closes the loopholes: an
 * aliased import, `React.useEffect`, and the sibling primitives that do the
 * same job (`useLayoutEffect` for `useEffect`) are all the same violation.
 * Because the import is the subject, a rename and a namespace import are
 * covered by the shape of the rule rather than by a list of spellings, and the
 * name a call is written under never matters.
 *
 * Two ways of holding the module are out of reach and stay that way. The
 * namespace copied into a second variable, `const R = React`, would need the
 * assignments followed, and no file is written that way. `await import()` of
 * the module hands it out at runtime, and lazily loading the framework itself
 * inside an app that is already rendering is not a thing anyone does.
 */
export function createPrimitiveBan({
  description,
  module,
  names,
  guidance,
  url,
}: {
  description: string
  module: string
  names: string[]
  guidance: string
  url: string
}): PrimitiveBan {
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
        banned: `\`{{name}}\` from ${module} is not available here. ${guidance}{{hint}}`,
        reexportAll: `Re-exporting everything from ${module} hands out the primitives this rule bans. Export the specific names instead.`,
      },
    },
    create(context) {
      const options = { ...defaults, ...context.options[0] }
      const banned = new Set(options.names)
      const { hint } = options
      const hintText = hint ? ` ${hint}` : ''
      const { sourceCode } = context

      /** Whether the scope resolves an identifier to the default or the namespace import of the module (`React`, `* as R`). */
      function bindsModule(node: TSESTree.Identifier): boolean {
        const def = variableFor(sourceCode, node)?.defs.find((candidate) => candidate.type === TSESLint.Scope.DefinitionType.ImportBinding)
        if (def?.parent.type !== AST_NODE_TYPES.ImportDeclaration || def.parent.source.value !== module || def.parent.importKind === 'type') return false
        return def.node.type === AST_NODE_TYPES.ImportDefaultSpecifier || def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier
      }

      /** The name a destructured property reads: a plain key, or a computed key that is a string written out. */
      function keyName(property: TSESTree.Property): string | undefined {
        if (!property.computed) return exportedName(property.key)
        return property.key.type === AST_NODE_TYPES.Literal && typeof property.key.value === 'string' ? property.key.value : undefined
      }

      function report(node: TSESTree.Node, name: string): void {
        context.report({ node, messageId: 'banned', data: { name, hint: hintText } })
      }

      return {
        ImportDeclaration(node) {
          if (node.source.value !== module || node.importKind === 'type') return
          for (const specifier of node.specifiers) {
            if (specifier.type !== AST_NODE_TYPES.ImportSpecifier || specifier.importKind === 'type') continue
            const name = exportedName(specifier.imported)
            if (banned.has(name)) report(specifier, name)
          }
        },
        ExportNamedDeclaration(node) {
          if (node.source?.value !== module || node.exportKind === 'type') return
          for (const specifier of node.specifiers) {
            if (specifier.exportKind === 'type') continue
            const name = exportedName(specifier.local)
            if (banned.has(name)) report(specifier, name)
          }
        },
        ExportAllDeclaration(node) {
          if (node.source.value === module && node.exportKind !== 'type') {
            context.report({ node, messageId: 'reexportAll' })
          }
        },
        MemberExpression(node) {
          if (node.object.type !== AST_NODE_TYPES.Identifier || !bindsModule(node.object)) return
          const name = staticMemberName(node)
          if (name !== undefined && banned.has(name)) report(node.property, name)
        },
        VariableDeclarator(node) {
          if (node.id.type !== AST_NODE_TYPES.ObjectPattern || node.init?.type !== AST_NODE_TYPES.Identifier) return
          if (!bindsModule(node.init)) return
          for (const property of node.id.properties) {
            if (property.type !== AST_NODE_TYPES.Property) continue
            const name = keyName(property)
            if (name !== undefined && banned.has(name)) report(property, name)
          }
        },
      }
    },
  }
}
