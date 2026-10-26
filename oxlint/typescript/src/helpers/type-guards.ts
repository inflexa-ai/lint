import type { ESTree } from '@oxlint/plugins'
import { unwrapTransparent } from './type-annotations.ts'

/** The functions that can carry a type guard. */
export type GuardFunction = ESTree.Function | ESTree.ArrowFunctionExpression

/**
 * Who answers for a type guard. `no-unknown-type-guards` owns an `untyped`
 * guard, which validates data of no known shape, and asks for a schema.
 * `require-assertion-safety` owns a `typed` guard, which narrows a known type
 * with a claim that TypeScript does not check, and asks for a SAFETY comment.
 * The two rules read this one answer, so that a guard never gets both reports.
 */
export type GuardKind = 'untyped' | 'typed'

/** Whether a written type admits a value of any shape: `unknown`, `any`, `object`, `{}`, or a container of one. */
function isOpenType(type: ESTree.TSType): boolean {
  const resolved = unwrapTransparent(type)
  if (resolved.type === 'TSUnknownKeyword' || resolved.type === 'TSAnyKeyword' || resolved.type === 'TSObjectKeyword') return true
  if (resolved.type === 'TSTypeLiteral') return resolved.members.length === 0
  if (resolved.type === 'TSUnionType') return resolved.types.some(isOpenType)
  if (resolved.type !== 'TSTypeReference' || resolved.typeName.type !== 'Identifier') return false
  const params = resolved.typeArguments?.params ?? []
  const argument = resolved.typeName.name === 'Readonly' ? params.at(0) : resolved.typeName.name === 'Record' ? params.at(1) : undefined
  return argument !== undefined && isOpenType(argument)
}

/** Whether a function is an argument of a call, which gives its parameters their types. */
function isCallArgument(node: GuardFunction): boolean {
  const { parent } = node
  return parent.type === 'CallExpression' && parent.arguments.some((argument) => argument === node)
}

/** Which rule answers for a function's type predicate, or `undefined` when it declares none over a parameter. */
export function guardKind(node: GuardFunction): GuardKind | undefined {
  const predicate = node.returnType?.typeAnnotation
  if (predicate?.type !== 'TSTypePredicate' || predicate.parameterName.type !== 'Identifier') return undefined

  const { name } = predicate.parameterName
  const parameter = node.params.filter((param) => param.type === 'Identifier').find((param) => param.name === name)
  if (!parameter) return undefined

  const type = parameter.typeAnnotation?.typeAnnotation
  if (type === undefined ? !isCallArgument(node) : isOpenType(type)) return 'untyped'
  return predicate.typeAnnotation ? 'typed' : undefined
}
