import type { ESTree, Rule } from '@oxlint/plugins'
import { type GuardFunction, guardKind } from '../helpers/type-guards.ts'

// A statement that a block or the program holds is where the reason for an
// assertion reads: a person writes the invariant above that line, not squeezed
// inside the expression. A statement in a body without braces is the child of
// its `if` or loop, so the walk goes on to the `if` or the loop, which the
// block holds.
const HOLDERS = new Set(['Program', 'BlockStatement', 'StaticBlock', 'SwitchCase', 'TSModuleBlock', 'ClassBody'])

const SAFETY = /\bSAFETY\s*:/

/** Whether a node asserts to `const`, which widens nothing and states no invariant. */
function isConstAssertion(node: ESTree.TSAsExpression | ESTree.TSTypeAssertion): boolean {
  return node.typeAnnotation.type === 'TSTypeReference' && node.typeAnnotation.typeName.type === 'Identifier' && node.typeAnnotation.typeName.name === 'const'
}

/** An overload signature or an implementation, at the level of a module, a block or a class body. */
type OverloadMember = { key: string; name: string; node: ESTree.Node; returnType: ESTree.TSTypeAnnotation | null | undefined; implementation: boolean }

/** A function declaration or a method as an overload member, or `undefined` for any other statement or member. */
function overloadMember(statement: ESTree.Node): OverloadMember | undefined {
  const node = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration' ? statement.declaration : statement
  if (node?.type === 'FunctionDeclaration' || node?.type === 'TSDeclareFunction') {
    if (!node.id) return undefined
    return { key: node.id.name, name: node.id.name, node: statement, returnType: node.returnType, implementation: node.type === 'FunctionDeclaration' && !node.declare }
  }
  if (node?.type === 'MethodDefinition' && !node.computed && node.key.type === 'Identifier') {
    const key = `${node.static ? 'static' : 'instance'} ${node.kind} ${node.key.name}`
    return { key, name: node.key.name, node, returnType: node.value.returnType, implementation: node.value.type === 'FunctionExpression' }
  }
  return undefined
}

/**
 * `value as Target` tells the compiler to stop checking and believe the
 * annotation. The dangerous forms are reported elsewhere: `as unknown as T` by
 * `no-double-cast`, and an `as` that narrows a type the compiler cannot follow
 * by `@typescript-eslint/no-unsafe-type-assertion`. What is left is an
 * assertion the compiler accepts, which is sound only because of something the
 * writer knows and the types do not say: a discriminant checked on the line
 * above, a backend contract the program owns, a value the runtime built.
 *
 * That reason is invisible to the next reader, so this rule asks for it in a
 * `SAFETY:` comment before the assertion on its line, or above the statement
 * that holds it. A statement in a body without braces belongs to its `if` or
 * loop. The one in `create-api-client.ts` states the trust boundary; there is
 * no other in the repository, and there is meant to be none without the
 * invariant beside it.
 *
 * A narrowing is not a reason for a SAFETY comment: `no-unsafe-type-assertion`
 * reports it whatever the comment says, and a check that TypeScript follows
 * narrows the value with no assertion at all.
 *
 * Two other forms make the same unchecked claim without the `as`. A type
 * predicate (`x is T`, `asserts x is T`) over a known type is believed by the
 * compiler and never compared with its body; a predicate over data of no known
 * shape is reported by `no-unknown-type-guards` instead, and both rules read
 * `guardKind` so a guard gets one report. An overload set whose implementation
 * declares a different return type is a cast as well, because TypeScript only
 * asks that the overload and the implementation be related.
 *
 * `as const` is left alone: it freezes a literal and widens nothing, so it
 * carries no claim to justify. The comment is asked for once per statement,
 * where a person reads it, rather than crowded against the operator. A comment
 * above an `if` or a loop does not reach the statements of its block, and a
 * comment above a function does not reach a cast in an `if` test.
 */
export const requireAssertionSafety: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'State the invariant behind a type assertion in a SAFETY comment',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/require-assertion-safety.md',
    },
    schema: [],
    messages: {
      missingSafety:
        'This `as` tells the compiler to stop checking, and nothing here says why that is sound. State the invariant in a `SAFETY:` comment above the statement that holds the `as`, or before the `as` on its line: the contract that guarantees its shape, or the reason the runtime built it. A statement in a body without braces belongs to its `if` or loop. To narrow a value, do not assert: narrow it with a check that TypeScript follows, such as a comparison of a discriminant or an `in` check. If the value comes from outside the program, parse it with a zod schema instead.',
      uncheckedGuard:
        'This type predicate tells the compiler to believe the narrowing, and TypeScript never compares it with the body. Remove the predicate and let TypeScript infer it from a check that it follows, such as a comparison of a discriminant. If the claim must stay, state the invariant in a `SAFETY:` comment before the function.',
      uncheckedOverload:
        'The overloads of `{{name}}` return a type that the implementation does not declare, so each call trusts a return type that TypeScript never checks. Give the implementation the return type of the overloads, or state the invariant in a `SAFETY:` comment before the overloads or the implementation.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** Whether a `SAFETY:` comment sits before the assertion, up to the statement that a block or the program holds. */
    function hasSafety(node: ESTree.Node): boolean {
      for (let current = node; ; current = current.parent) {
        if (sourceCode.getCommentsBefore(current).some((comment) => comment.range[1] <= node.range[0] && SAFETY.test(comment.value))) return true
        if (current.parent === null || HOLDERS.has(current.parent.type)) return false
      }
    }

    function check(node: ESTree.TSAsExpression | ESTree.TSTypeAssertion): void {
      if (isConstAssertion(node) || hasSafety(node)) return
      context.report({ node, messageId: 'missingSafety' })
    }

    function checkGuard(node: GuardFunction): void {
      if (node.returnType && guardKind(node) === 'typed' && !hasSafety(node)) {
        context.report({ node: node.returnType, messageId: 'uncheckedGuard' })
      }
    }

    /** Reports each implementation whose return type differs from that of an overload before it. */
    function checkOverloads(members: readonly ESTree.Node[]): void {
      let overloads: OverloadMember[] = []
      for (const statement of members) {
        const member = overloadMember(statement)
        if (member === undefined) {
          overloads = []
          continue
        }
        if (overloads.length > 0 && overloads[0].key !== member.key) overloads = []
        if (!member.implementation) {
          overloads.push(member)
          continue
        }
        const signatures = overloads
        const first = signatures.at(0)
        overloads = []
        const { returnType } = member
        if (first === undefined || !returnType) continue
        const declared = textOf(returnType)
        const differs = signatures.some((overload) => overload.returnType && textOf(overload.returnType) !== declared)
        if (differs && !hasSafety(first.node) && !hasSafety(member.node)) {
          context.report({ node: returnType, messageId: 'uncheckedOverload', data: { name: member.name } })
        }
      }
    }

    /** The source text of a type annotation without its whitespace, so that a line break does not make two types differ. */
    function textOf(annotation: ESTree.TSTypeAnnotation): string {
      return sourceCode.getText(annotation.typeAnnotation).replaceAll(/\s+/g, '')
    }

    return {
      TSAsExpression: check,
      TSTypeAssertion: check,
      FunctionDeclaration: checkGuard,
      FunctionExpression: checkGuard,
      ArrowFunctionExpression: checkGuard,
      Program: (node) => checkOverloads(node.body),
      BlockStatement: (node) => checkOverloads(node.body),
      TSModuleBlock: (node) => checkOverloads(node.body),
      ClassBody: (node) => checkOverloads(node.body),
    }
  },
}
