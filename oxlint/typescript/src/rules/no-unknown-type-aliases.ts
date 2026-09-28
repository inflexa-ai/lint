import type { ESTree, Rule } from '@oxlint/plugins'
import { bareReferenceName, collectTypeAliases } from '../helpers/type-annotations.ts'

/**
 * `type Payload = unknown` gives `unknown` a domain name and lets it travel as
 * though it were parsed. Every reader believes the name and finds only the top
 * type under it, so the alias buys nothing and hides what it costs. `unknown`
 * is meant to be visible: it belongs at the parse boundary and on an error
 * `cause`, spelled out, so a reader sees that the value is not yet checked.
 *
 * A union that includes `unknown` collapses to `unknown`, and an alias that
 * resolves to another alias of the same file is followed to its end, so the
 * name cannot launder the top type through a second hop. A name from another
 * file is not followed, because reading one file cannot see what it means.
 */
export const noUnknownTypeAliases: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep unknown visible instead of hiding it behind an alias',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-unknown-type-aliases.md',
    },
    schema: [],
    messages: {
      unknownAlias:
        'The alias `{{name}}` resolves to `unknown`, which lets the top type travel under a domain name as though it were parsed. Keep `unknown` spelled out where a value is not yet checked: at the parse boundary, or on an error `cause`. Everywhere else, name the type a zod schema proves.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const aliases = collectTypeAliases(node)

        /** Whether an alias body is `unknown` once unions and this file's aliases are followed. */
        function resolvesToUnknown(type: ESTree.TSType, visited: Set<string>): boolean {
          if (type.type === 'TSUnknownKeyword') return true
          if (type.type === 'TSUnionType') return type.types.some((member) => resolvesToUnknown(member, visited))
          const name = bareReferenceName(type)
          if (name === undefined || visited.has(name)) return false
          const alias = aliases.get(name)
          if (alias === undefined || alias.typeParameters) return false
          return resolvesToUnknown(alias.typeAnnotation, new Set([...visited, name]))
        }

        for (const alias of aliases.values()) {
          if (resolvesToUnknown(alias.typeAnnotation, new Set([alias.id.name]))) {
            context.report({ node: alias.id, messageId: 'unknownAlias', data: { name: alias.id.name } })
          }
        }
      },
    }
  },
}
