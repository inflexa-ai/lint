import {
  isArrayLiteralExpression,
  isArrowFunction,
  isAwaitExpression,
  isCallExpression,
  isFunctionExpression,
  isIdentifier,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isSourceFile,
  isVariableDeclaration,
  isYieldExpression,
  type Node,
  SyntaxKind,
} from 'typescript/unstable/ast'
import { isUnionType, type Type } from 'typescript/unstable/sync'
import type { RuleContext, RuleModule } from '../rule.ts'
import { stringArraysOnly } from '../rule-options.ts'

type Options = { consumers: string[] }

/** The methods that make a type a neverthrow `Result`, on its apparent type or on a member of its union. */
const RESULT_PROPERTIES = ['mapErr', 'map', 'andThen', 'orElse', 'match', 'unwrapOr']

/** The calls that use a Result: the upstream set, and the checks that the inflexa subsystems call. */
const HANDLED_METHODS = new Set(['match', 'unwrapOr', '_unsafeUnwrap', '_unsafeUnwrapErr', 'isOk', 'isErr'])

/** The reads of a property that use a Result in the inflexa subsystems, called or not. */
const HANDLED_PROPERTIES = new Set(['error', 'value', 'isOk', 'isErr'])

const CHECKED_METHODS = new Set(['isOk', 'isErr'])

/** The transforms that forward a Result into the Result they give, which a consumer then takes. */
const FORWARDING_METHODS = new Set(['orElse', 'map', 'mapErr', 'andThen'])

/**
 * The parents that leave a value out of the rule, as upstream leaves them: a
 * type assertion or a non-null assertion (upstream: a parent whose ESTree type
 * starts with `TS`), and the declarations whose values it cannot follow, such
 * as a class field that a method reads through `this`.
 */
const IGNORED_PARENTS = new Set<SyntaxKind>([
  SyntaxKind.AsExpression,
  SyntaxKind.SatisfiesExpression,
  SyntaxKind.TypeAssertionExpression,
  SyntaxKind.NonNullExpression,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.PropertyDeclaration,
])

/** The nodes where a walk up to a use stops: the nearest block or the file, as upstream stops at a block or the program. */
const END_OF_WALK = new Set<SyntaxKind>([SyntaxKind.Block, SyntaxKind.SourceFile])

/** The parent of a node above the parentheses around it, which the ESTree of upstream does not have, or `undefined` for the file. */
function parentOf(node: Node): Node | undefined {
  if (isSourceFile(node)) return undefined
  let parent = node.parent
  while (isParenthesizedExpression(parent)) parent = parent.parent
  return parent
}

/** A node without the parentheses around it. */
function unwrap(node: Node): Node {
  let current = node
  while (isParenthesizedExpression(current)) current = current.expression
  return current
}

/** The name of a property access, or `undefined` for an element access and a private name, as upstream reads only an identifier. */
function memberName(node: Node): string | undefined {
  return isPropertyAccessExpression(node) && isIdentifier(node.name) ? node.name.text : undefined
}

/** Whether a node is the callee of the call above it. */
function isCallee(node: Node): boolean {
  const parent = parentOf(node)
  return parent !== undefined && isCallExpression(parent) && unwrap(parent.expression) === node
}

function isSafeTryCallee(callee: Node): boolean {
  const target = unwrap(callee)
  if (isIdentifier(target)) return target.text === 'safeTry'
  return memberName(target) === 'safeTry'
}

/** Whether the value is the operand of a `yield*` in the generator function that `safeTry` receives. */
function isInsideSafeTryYield(node: Node): boolean {
  let current = node
  let foundYieldDelegate = false
  for (let parent = parentOf(current); parent !== undefined; parent = parentOf(current)) {
    if (isYieldExpression(parent) && parent.expression !== undefined && unwrap(parent.expression) === current) {
      if (parent.asteriskToken === undefined) return false
      foundYieldDelegate = true
    }
    if (foundYieldDelegate && (isFunctionExpression(parent) || isArrowFunction(parent))) {
      const call = parentOf(parent)
      if (call === undefined || !isCallExpression(call) || !call.arguments.some((argument) => unwrap(argument) === parent)) return false
      return isSafeTryCallee(call.expression)
    }
    if (parent.kind === SyntaxKind.SourceFile) return false
    current = parent
  }
  return false
}

/**
 * Whether a handled method is called on the value, or a handled property is
 * read off it, directly or at the end of a chain of calls on it (upstream
 * `isHandledResult`, with the inflexa extensions). The walk steps up through
 * an `await`, which takes the place of the upstream step down into the operand
 * of an `await`, a step that finds nothing on its own.
 */
function isHandledResult(node: Node): boolean {
  const parent = parentOf(node)
  if (parent !== undefined && isAwaitExpression(parent)) return isHandledResult(parent)
  if (parent !== undefined && (isPropertyAccessExpression(parent) || parent.kind === SyntaxKind.ElementAccessExpression)) {
    const name = memberName(parent)
    if (name !== undefined && HANDLED_METHODS.has(name) && isCallee(parent)) return true
    if (name !== undefined && HANDLED_PROPERTIES.has(name)) return true
    // A chain of method calls: `.map(…).unwrapOr(…)`.
    const above = parentOf(parent)
    if (above !== undefined && above.kind !== SyntaxKind.ExpressionStatement) return isHandledResult(above)
  }
  return false
}

/** Upstream `isCheckedResult`: a variable whose `isOk` or `isErr` is read inside a call. */
function isCheckedResult(node: Node): boolean {
  const parent = parentOf(node)
  if (!isIdentifier(node) || parent === undefined) return false
  const name = memberName(parent)
  const above = parentOf(parent)
  return name !== undefined && CHECKED_METHODS.has(name) && above !== undefined && isCallExpression(above)
}

/** Upstream `isReturned`: an ancestor up to the nearest block is a `return` or an arrow function. */
function isReturned(node: Node): boolean {
  for (let current = node; !END_OF_WALK.has(current.kind); current = current.parent) {
    if (isArrowFunction(current) || current.kind === SyntaxKind.ReturnStatement) return true
  }
  return false
}

/**
 * Whether a function that the option `consumers` names takes the value as an
 * argument, directly or through a chain of transforms that forward it, and
 * through the wrappers that keep the same value.
 */
function isConsumed(node: Node, consumers: ReadonlySet<string>): boolean {
  if (consumers.size === 0) return false
  let current = node
  for (let parent = parentOf(current); parent !== undefined; parent = parentOf(current)) {
    if (isCallExpression(parent) && isIdentifier(parent.expression) && consumers.has(parent.expression.text) && parent.arguments.some((argument) => unwrap(argument) === current))
      return true
    const name = memberName(parent)
    const above = parentOf(parent)
    if (name !== undefined && FORWARDING_METHODS.has(name) && above !== undefined && isCallExpression(above) && unwrap(above.expression) === parent) {
      current = above
      continue
    }
    const forwards = isAwaitExpression(parent) || parent.kind === SyntaxKind.AsExpression || parent.kind === SyntaxKind.NonNullExpression
    if (!forwards) return false
    current = parent
  }
  return false
}

/**
 * A port of `must-use-result` of `@ninoseki/eslint-plugin-neverthrow` 0.3.2
 * (MIT) to the AST and the checker of TypeScript 7, with the extensions of the
 * inflexa subsystems: `isOk`, `isErr` and `_unsafeUnwrapErr` as handled calls,
 * the reads of `error`, `value`, `isOk` and `isErr`, and the functions of the
 * option `consumers`, which take a Result and handle it.
 *
 * A Result that nothing reads is an error that nothing handles: the failure it
 * carries goes away in silence, which is what the type was chosen to prevent.
 */
export const mustUseResult: RuleModule<Options> = {
  meta: {
    docs: {
      description: 'Require each neverthrow Result to be used',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/must-use-result.md',
    },
    messages: {
      mustUseResult: 'Result must be handled with either of match, unwrapOr, _unsafeUnwrap or _unsafeUnwrapErr.',
    },
    defaultOptions: { consumers: [] },
  },
  checkOptions: stringArraysOnly,
  create(context: RuleContext<Options>) {
    const { checker, sourceFile } = context
    const consumers = new Set(context.options.consumers)
    const resultLike = new Map<number, boolean>()

    function typeIsResult(type: Type): boolean {
      const cached = resultLike.get(type.id)
      if (cached !== undefined) return cached
      const apparent = checker.getApparentType(type) ?? type
      const members = isUnionType(apparent) ? apparent.getTypes() : [apparent]
      const result = members.some((member) => RESULT_PROPERTIES.every((property) => checker.getPropertyOfType(member, property) !== undefined))
      resultLike.set(type.id, result)
      return result
    }

    function isResultLike(node: Node | undefined): boolean {
      if (node === undefined) return false
      const type = checker.getTypeAtLocation(node)
      return type !== undefined && typeIsResult(type)
    }

    /** Upstream `getEnclosingResultCall`: an element of an array that goes directly into a call that gives a Result. */
    function isInResultCall(node: Node): boolean {
      const array = parentOf(node)
      if (array === undefined || !isArrayLiteralExpression(array) || !array.elements.some((element) => unwrap(element) === node)) return false
      const call = parentOf(array)
      return call !== undefined && isCallExpression(call) && call.arguments.some((argument) => unwrap(argument) === array) && isResultLike(call)
    }

    /** Upstream `getAssignation`: the name of the nearest variable up to a block whose initializer is a Result. */
    function assignedName(node: Node): Node | undefined {
      for (let current = node; !END_OF_WALK.has(current.kind); current = current.parent) {
        if (isVariableDeclaration(current) && isResultLike(current.initializer) && isIdentifier(current.name)) return current.name
      }
      return undefined
    }

    /** Upstream `handleAssignation`: whether a reference of the variable that holds the value uses it. */
    function isUsedThroughVariable(node: Node): boolean {
      const name = assignedName(node)
      if (name === undefined) return false
      const symbol = checker.getSymbolAtLocation(name)
      if (symbol === undefined) return false
      return checker.getReferencesToSymbolInFile(sourceFile.fileName, symbol).some((handle) => {
        const reference = handle.resolve()
        if (reference === undefined || (reference.pos === name.pos && reference.end === name.end)) return false
        return !isUnused(reference, true)
      })
    }

    /**
     * Upstream `processSelector`: whether a value is a Result that nothing
     * uses. It reports the value at the expression that gives it, also when a
     * variable holds it, and a reference of a variable reports nothing itself.
     */
    function isUnused(node: Node, isReference: boolean): boolean {
      const parent = parentOf(node)
      if (parent !== undefined && IGNORED_PARENTS.has(parent.kind)) return false
      if (!isResultLike(node)) return false
      // The `await` above a call reports it, thus the call does not report twice.
      if (isCallExpression(node) && parent !== undefined && isAwaitExpression(parent)) return false
      if (isHandledResult(node) || isInsideSafeTryYield(node) || isCheckedResult(node) || isReturned(node) || isInResultCall(node) || isConsumed(node, consumers)) return false
      if (isUsedThroughVariable(node)) return false
      if (!isReference) context.report({ node, messageId: 'mustUseResult' })
      return true
    }

    const visit = (node: Node): void => {
      isUnused(node, false)
    }
    return { [SyntaxKind.CallExpression]: visit, [SyntaxKind.NewExpression]: visit, [SyntaxKind.AwaitExpression]: visit }
  },
}
