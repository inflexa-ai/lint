import type { TSESLint } from '@typescript-eslint/utils'
import path from 'node:path'
import { moduleSourceVisitors } from '../helpers/module-sources.ts'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { scopes: string[]; workspaces: string[] }

const DEFAULTS: Options = { scopes: [], workspaces: ['packages', 'apps'] }

/** A string, escaped to match itself inside a regular expression. */
function literal(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * A specifier that names a package of one of the scopes and then keeps going
 * into it: `@acme/ui/src/components/button.tsx`, `@acme/hooks/dist/index.js`.
 * The part after the package name is what the package's `exports` decides, and
 * these are the two ways to write a path that is not one. With no scope given,
 * each scope counts.
 */
function insidePackagePattern(scopes: string[]): RegExp {
  const scope = scopes.length === 0 ? '@[^/]+' : `(?:${scopes.map(literal).join('|')})`
  return new RegExp(`^(${scope}\\/[a-z0-9-]+)\\/(src|dist|node_modules)\\/`)
}

/**
 * Where a workspace begins, as a path reads: `packages/ui`, `apps/web`. The
 * folders that hold shared build and test configuration are not workspaces and
 * are reached relatively on purpose.
 */
function workspacePattern(roots: string[]): RegExp {
  return new RegExp(`(?:^|\\/)((?:${roots.map(literal).join('|')})\\/[^/]+)\\/`)
}

/** The workspace a path lies in, or nothing when it lies outside every one. */
function workspaceOf(workspace: RegExp, file: string): string | undefined {
  return workspace.exec(file)?.[1]
}

/**
 * The workspace a relative specifier lands in, when it is not the one it was
 * written in. Resolved as a path because that is what the specifier is: two
 * levels up from `packages/ui/src` is `packages`, and the next segment names
 * whichever workspace the import actually reaches.
 */
function otherWorkspace(workspace: RegExp, file: string, specifier: string): string | undefined {
  const from = workspaceOf(workspace, file)
  if (from === undefined) return undefined

  const landed = workspaceOf(workspace, `${path.posix.join(path.posix.dirname(file), specifier)}/`)
  return landed !== undefined && landed !== from ? landed : undefined
}

/**
 * A package is reached through the entries its `package.json` declares, and
 * through nothing else.
 *
 * Those entries are the whole of what a package promises. A file reached around
 * them is private by intent: it can move or go, and the compiler will not say
 * so at the import site, because a deep path resolves whether or not anyone
 * meant it to. A relative climb out of a workspace does the same thing and
 * skips the package boundary as well, so the dependency never appears in a
 * `package.json` and nothing can see that it exists.
 *
 * The rule reads specifiers only. What a package chooses to export, and which
 * package may depend on which, are decided elsewhere: in `exports`, and in
 * `@inflexa-ai/react/no-app-concerns`.
 */
export const packageEntryPoints: TSESLint.RuleModule<'insidePackage' | 'climbsOut', [Partial<Options>]> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Reach a package through the entries it declares',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/package-entry-points.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // The scopes of the packages of this repository, for example `@acme`.
          scopes: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          // The folders that hold one workspace in each child folder.
          workspaces: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      insidePackage:
        'This reaches inside `{{package}}` instead of through an entry it declares. Import the subpath the package exports, `{{package}}/button`, and add an entry under `exports` in its `package.json` when the module it should reach has none. What is reached around `exports` is private: it can move without the import site being told.',
      climbsOut:
        'This reaches `{{workspace}}` by climbing out of its own workspace, so the dependency appears in no `package.json` and nothing records that it exists. Import the package by its name, and declare it as a dependency. A folder that is no workspace, the shared build and test configuration among them, is reached relatively as before.',
    },
  },
  create(context) {
    const { scopes, workspaces } = { ...DEFAULTS, ...context.options[0] }
    const insidePackage = insidePackagePattern(scopes)
    const workspace = workspacePattern(workspaces)

    return moduleSourceVisitors((source, specifier) => {
      const inside = insidePackage.exec(specifier)
      if (inside) {
        context.report({ node: source, messageId: 'insidePackage', data: { package: inside[1] } })
        return
      }

      if (!specifier.startsWith('.')) return
      const landed = otherWorkspace(workspace, context.filename, specifier)
      if (landed !== undefined) context.report({ node: source, messageId: 'climbsOut', data: { workspace: landed } })
    })
  },
}
