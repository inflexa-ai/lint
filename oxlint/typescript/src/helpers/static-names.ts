import type { ESTree, Scope, SourceCode, Variable } from '@oxlint/plugins'

/** An identifier node, in each of the roles that the AST of oxlint gives it. */
export type Identifier = Extract<ESTree.Node, { type: 'Identifier' }>

/**
 * The identifiers that each name the global object itself. A member read off
 * one of them names the same thing as the bare identifier, thus
 * `globalThis.fetch`, `window.fetch` and `fetch` are one name, and a rule that
 * reads only the bare one leaves three spellings of its target open.
 */
const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self'])

/**
 * The name a member expression reads, written plainly or as a string in
 * brackets, or `undefined` where the name is computed from a value and no
 * reading of the source can say what it is.
 */
export function staticMemberName(node: ESTree.MemberExpression): string | undefined {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name
  if (node.property.type === 'Literal' && typeof node.property.value === 'string') return node.property.value
  return undefined
}

/**
 * The name an import or export specifier names in the module it comes from,
 * which is what a rule about that module asks. It is not the local name: a
 * rename changes the local and leaves this one alone.
 */
export function exportedName(node: ESTree.ModuleExportName): string {
  return node.type === 'Identifier' ? node.name : node.value
}

/** The variable an identifier resolves to, looking outward from the scope it sits in. */
export function variableFor(sourceCode: SourceCode, node: Identifier): Variable | undefined {
  for (let scope: Scope | null = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)
    if (variable) return variable
  }
  return undefined
}

/**
 * Whether an identifier is the global of that name. A declared global carries
 * no definition of its own, and an undeclared one resolves to no variable at
 * all, so both answer yes; either way nothing in this program gave the name a
 * meaning. A binding somebody wrote — a parameter, an import, a local — is a
 * different thing that happens to share a name, and answers no.
 */
export function isGlobalIdentifier(sourceCode: SourceCode, node: Identifier): boolean {
  return (variableFor(sourceCode, node)?.defs.length ?? 0) === 0
}

/** The steps of a member chain rooted in a global, outermost last. */
function pathOf(sourceCode: SourceCode, node: ESTree.Node): string[] | undefined {
  if (node.type === 'Identifier') return isGlobalIdentifier(sourceCode, node) ? [node.name] : undefined
  if (node.type !== 'MemberExpression') return undefined

  const name = staticMemberName(node)
  if (name === undefined) return undefined

  const base = pathOf(sourceCode, node.object)
  return base === undefined ? undefined : [...base, name]
}

/**
 * The global an expression reads, both as the author wrote it and as it is
 * named. `globalThis['fetch']` is written `globalThis.fetch` and names `fetch`;
 * `window.navigator.sendBeacon` names `navigator.sendBeacon`. `undefined` where
 * the expression is rooted in a binding of somebody's own, or where a step of
 * it is computed from a value and no reading of the source settles it.
 *
 * `path` is for a message, which should show what the reader will find in the
 * file. `name` is for the decision, which is about the thing and not about the
 * spelling.
 */
export function globalReadOf(sourceCode: SourceCode, node: ESTree.Node): { path: string; name: string } | undefined {
  const steps = pathOf(sourceCode, node)
  if (steps === undefined) return undefined

  // A qualifier is dropped while one step is left to name, so `globalThis`
  // alone still names `globalThis`.
  let from = 0
  while (from < steps.length - 1 && GLOBAL_OBJECTS.has(steps[from])) from += 1

  return { path: steps.join('.'), name: steps.slice(from).join('.') }
}
