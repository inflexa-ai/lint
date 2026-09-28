import type { ESTree, Rule } from '@oxlint/plugins'
import { exportedName, isGlobalIdentifier, staticMemberName } from '../helpers/static-names.ts'

// The zod builders that accept whatever they are given. `z.any()` and
// `z.unknown()` say so in their names; `z.custom<T>()` checks only what its
// argument checks, and with no argument it checks nothing at all.
const ACCEPTS_ANYTHING = new Set(['any', 'unknown'])

/**
 * Every specifier that hands out zod: the library, and a configured re-export
 * of it in a module named `zod.ts`, which a repository can reach through an
 * alias or relatively.
 */
const ZOD_SOURCE = /^zod(\/|$)|(^|\/)zod\.ts$/

/** The name the module exports its namespace under, whatever a file calls it locally. */
const ZOD_EXPORT = 'z'

/**
 * A schema is what makes untyped data typed, so one that checks nothing is a
 * cast wearing a schema's clothes.
 *
 * It matters most where a schema is compulsory. An untrusted client requires
 * one on every request precisely because that backend's word is not enough; a
 * `z.any()` there satisfies the type, returns whatever arrived, and reads at
 * the call site as though it had been validated. That is worse than a plain
 * cast, which at least says what it is doing where it is written.
 *
 * `z.custom<T>(check)` with a real check is a schema: the tag check that tells
 * a `FormData` from a body built in another realm is one, and structural tests
 * like it are why the builder exists. Only the empty form is reported.
 *
 * The receiver is recognised by the import it came from, so a rename
 * (`import { z as schema }`) and a namespace import (`zod.z.any()`) are the
 * same finding, and an unrelated object's `any()` stays out of it. A file that
 * imports nothing from zod and still writes `z` is covered as well: nothing
 * declares a global of that name, one import is the only door lint leaves open,
 * and so a free `z` in a file that compiles can be nothing else.
 *
 * The builder pulled out of the namespace first, `const build = z.any`, is not
 * followed. Nobody writes it, and chasing it would be a dataflow analysis for a
 * shape that only appears when somebody is working around this rule.
 */
export const noEmptySchema: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Let a schema check something',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-empty-schema.md',
    },
    schema: [],
    messages: {
      emptySchema:
        '`z.{{builder}}()` accepts whatever it is given, so this parses nothing and the type it promises is a claim. Describe the shape you expect, `z.object({ … })`, and let the parse fail where the data arrives. Where the shape cannot be written as a schema, `z.custom<T>(check)` takes the check that decides it.',
    },
  },
  create(context) {
    // Locals bound to the namespace itself, and locals bound to the whole
    // module, whose own `z` is that same namespace.
    const namespaceBindings = new Set<string>()
    const moduleBindings = new Set<string>()

    /** Whether an expression is the zod namespace. */
    function isZod(node: ESTree.Node): boolean {
      if (node.type === 'Identifier') {
        return namespaceBindings.has(node.name) || (node.name === ZOD_EXPORT && isGlobalIdentifier(context.sourceCode, node))
      }
      if (node.type !== 'MemberExpression' || node.object.type !== 'Identifier') return false
      return moduleBindings.has(node.object.name) && staticMemberName(node) === ZOD_EXPORT
    }

    /** The `z.thing` of a `z.thing(...)` call, or nothing when the callee is shaped otherwise. */
    function zodBuilder(callee: ESTree.Expression): string | undefined {
      if (callee.type !== 'MemberExpression' || !isZod(callee.object)) return undefined
      return staticMemberName(callee)
    }

    return {
      Program(program) {
        // Collected up front so a call is judged wherever the import sits.
        for (const statement of program.body) {
          if (statement.type !== 'ImportDeclaration' || typeof statement.source.value !== 'string') continue
          if (!ZOD_SOURCE.test(statement.source.value)) continue

          for (const specifier of statement.specifiers) {
            if (specifier.type === 'ImportNamespaceSpecifier') moduleBindings.add(specifier.local.name)
            else if (specifier.type === 'ImportSpecifier' && exportedName(specifier.imported) === ZOD_EXPORT) namespaceBindings.add(specifier.local.name)
          }
        }
      },
      CallExpression(node) {
        const builder = zodBuilder(node.callee)
        if (builder === undefined) return

        const empty = ACCEPTS_ANYTHING.has(builder) || (builder === 'custom' && node.arguments.length === 0)
        if (empty) context.report({ node, messageId: 'emptySchema', data: { builder } })
      },
    }
  },
}
