import type { ESTree } from '@oxlint/plugins'

/**
 * Helpers the type-contract rules share. Each one reads a written type
 * annotation and asks what it denotes once the `readonly` operator and any
 * alias of one's own are followed through. A name resolved to what it means is
 * the same idea the value rules follow in `static-names.ts`: `type Bag =
 * unknown` used under its name is still `unknown`.
 *
 * Parentheses need no step: typescript-estree drops them, and `(unknown)`
 * reaches a rule as the `unknown` keyword itself.
 *
 * None of this asks the type checker. A rule here reads the alias declarations
 * of the same module and follows a reference to one of them, and it stops at a
 * name it cannot see, which is a name from another file or a generic parameter.
 * A cross-file alias is the one gap this leaves open, recorded where each rule
 * decides what to follow.
 */

/** The nodes that declare parameters and a return type. */
export type FunctionLike =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSConstructorType
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature

/** The selectors of the nodes of `FunctionLike`, for a rule that reads each of them. */
export const FUNCTIONS = [
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
  'TSCallSignatureDeclaration',
  'TSConstructSignatureDeclaration',
  'TSConstructorType',
  'TSFunctionType',
  'TSMethodSignature',
]

/**
 * The type a chain of `readonly` operators wraps. `readonly Record<string,
 * unknown>` is the same dictionary as the one without the word, so a rule that
 * reads the value type has to see through it.
 */
export function unwrapTransparent(type: ESTree.TSType): ESTree.TSType {
  let current = type
  while (current.type === 'TSTypeOperator' && current.operator === 'readonly') {
    current = current.typeAnnotation
  }
  return current
}

/**
 * The name a bare reference names, or `undefined` for anything else. A
 * reference that carries type arguments (`Foo<T>`) is not bare: following it
 * would mean substituting the arguments, which these rules do not do, so it is
 * left for the caller to stop at.
 */
export function bareReferenceName(type: ESTree.TSType): string | undefined {
  if (type.type !== 'TSTypeReference' || type.typeName.type !== 'Identifier') return undefined
  const args = type.typeArguments
  return args && args.params.length > 0 ? undefined : type.typeName.name
}

/**
 * The module's own type aliases, by name. A generic alias is kept too, so a
 * caller can see that a name is declared and decline to follow it rather than
 * mistake it for one from another file.
 */
export function collectTypeAliases(program: ESTree.Program): Map<string, ESTree.TSTypeAliasDeclaration> {
  const aliases = new Map<string, ESTree.TSTypeAliasDeclaration>()
  for (const statement of program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type === 'TSTypeAliasDeclaration') aliases.set(declaration.id.name, declaration)
  }
  return aliases
}

/**
 * The type-parameter names in scope at a node: the ones its own function or
 * alias declares, and the ones every enclosing one does. A parameter shadows a
 * module alias of the same name, so a rule that follows aliases must not follow
 * a name a `<T>` nearer the node already took.
 */
export function enclosingTypeParameterNames(node: ESTree.Node): Set<string> {
  const names = new Set<string>()
  for (let current: ESTree.Node = node; current.type !== 'Program'; current = current.parent) {
    const parameters = 'typeParameters' in current ? current.typeParameters?.params : undefined
    for (const parameter of parameters ?? []) names.add(parameter.name.name)
  }
  return names
}
