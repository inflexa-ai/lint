import {
  type CallExpression,
  type Expression,
  type ForOfStatement,
  isArrayBindingPattern,
  isArrowFunction,
  isBindingElement,
  isBinaryExpression,
  isBlock,
  isCallExpression,
  isDoStatement,
  isForInStatement,
  isForOfStatement,
  isForStatement,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isNonNullExpression,
  isObjectBindingPattern,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isReturnStatement,
  isSourceFile,
  isVariableDeclarationList,
  isWhileStatement,
  type Node,
  SyntaxKind,
} from '@typescript/native/unstable/ast'
import type { RuleModule } from '../rule.ts'

/** The methods that scan the array for a value. */
const VALUE_LOOKUPS = new Set(['includes', 'indexOf', 'lastIndexOf'])

/** The methods that scan the array with a predicate, which is a keyed lookup when the predicate is one equality. */
const PREDICATE_LOOKUPS = new Set(['find', 'findIndex', 'findLast', 'findLastIndex', 'some', 'filter'])

/** The methods of an array that call their callback once for each element. */
const ITERATING = new Set(['every', 'filter', 'find', 'findIndex', 'findLast', 'findLastIndex', 'flatMap', 'forEach', 'map', 'reduce', 'reduceRight', 'some'])

function unwrap(node: Node): Node {
  let current = node
  while (isParenthesizedExpression(current) || isNonNullExpression(current)) current = current.expression
  return current
}

function isCallback(node: Node): boolean {
  return isArrowFunction(node) || isFunctionExpression(node)
}

/** The expression a callback gives back, when its body is that one expression or one `return` of it. */
function returnedExpression(callback: Node): Expression | undefined {
  if (!isArrowFunction(callback) && !isFunctionExpression(callback)) return undefined
  const { body } = callback
  if (!isBlock(body)) return body
  const [only] = body.statements
  return body.statements.length === 1 && isReturnStatement(only) ? only.expression : undefined
}

function isEquality(node: Node): boolean {
  return isBinaryExpression(node) && (node.operatorToken.kind === SyntaxKind.EqualsEqualsEqualsToken || node.operatorToken.kind === SyntaxKind.EqualsEqualsToken)
}

/** Whether a predicate compares one value for equality, which a `Set` or a `Map` answers without a scan. */
function isEqualityPredicate(argument: Node | undefined): boolean {
  if (argument === undefined) return false
  const returned = returnedExpression(unwrap(argument))
  return returned !== undefined && isEquality(unwrap(returned))
}

/** The names that a binding, or a pattern of bindings, declares. */
function boundNames(name: Node, names: Set<string> = new Set()): Set<string> {
  if (isIdentifier(name)) names.add(name.text)
  else if (isObjectBindingPattern(name) || isArrayBindingPattern(name)) {
    for (const element of name.elements) if (isBindingElement(element) && element.name !== undefined) boundNames(element.name, names)
  }
  return names
}

/** The names that each element of a `for...of` statement binds. */
function elementNames(loop: ForOfStatement): Set<string> {
  const { initializer } = loop
  if (!isVariableDeclarationList(initializer)) return boundNames(unwrap(initializer))
  if (initializer.declarations.length === 0) return new Set()
  return boundNames(initializer.declarations[0].name)
}

function mentions(node: Node, names: ReadonlySet<string>): boolean {
  if (isIdentifier(node) && names.has(node.text)) return true
  return node.forEachChild((child) => (mentions(child, names) ? true : undefined)) === true
}

/** Whether one side of the comparison is an element, or a chain of property reads from one, and the other side does not read an element. */
function comparesElement(comparison: Node, names: ReadonlySet<string>): boolean {
  if (!isBinaryExpression(comparison)) return false
  const isElement = (side: Node): boolean => {
    const root = rootOf(side)
    return root !== undefined && isIdentifier(root) && names.has(root.text)
  }
  return (isElement(comparison.left) && !mentions(comparison.right, names)) || (isElement(comparison.right) && !mentions(comparison.left, names))
}

/** Whether the body of the loop compares an element to a value, outside of the functions that the body only makes. */
function searchesForValue(body: Node, names: ReadonlySet<string>): boolean {
  if (isCallback(body) || isFunctionDeclaration(body)) return false
  if (isEquality(body) && comparesElement(body, names)) return true
  return body.forEachChild((child) => (searchesForValue(child, names) ? true : undefined)) === true
}

/** The identifier or `this` at the start of a chain of property reads, or `undefined` when the chain holds a call or an element access. */
function rootOf(receiver: Node): Node | undefined {
  let current = unwrap(receiver)
  while (isPropertyAccessExpression(current)) current = unwrap(current.expression)
  return isIdentifier(current) || current.kind === SyntaxKind.ThisKeyword ? current : undefined
}

/** Whether `child` is a part of the loop `parent` that runs on each pass, rather than one time before the first. */
function repeatsIn(parent: Node, child: Node): boolean {
  if (isForStatement(parent)) return child === parent.condition || child === parent.incrementor || child === parent.statement
  if (isForOfStatement(parent) || isForInStatement(parent)) return child === parent.statement
  if (isWhileStatement(parent) || isDoStatement(parent)) return child === parent.expression || child === parent.statement
  return false
}

/**
 * A scan inside a loop multiplies: `selected.includes(row.id)` reads each
 * element of `selected` once for each row, so the work grows with the product
 * of both sizes, and the cost stays invisible until a customer has a thousand
 * of each. A `Set` or a `Map` built one time before the loop answers the same
 * question in constant time.
 *
 * The rule reports only the scans that a `Set` or a `Map` can replace: a value
 * lookup, and a predicate that compares one value for equality. A predicate
 * with any other test, such as a range or a prefix, has no keyed form. The
 * receiver must be an array that the loop does not declare: an array that each
 * pass builds again cannot be indexed one time.
 */
export const noLookupInLoop: RuleModule = {
  meta: {
    docs: {
      description: 'Look up a value in a loop through a Set or a Map, not through a scan of an array',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-lookup-in-loop.md',
    },
    defaultOptions: {},
    messages: {
      lookupInLoop:
        '`{{receiver}}.{{method}}` scans the whole array on each pass of the loop around it, so the work grows with the product of both sizes. Before the loop, build a `Set` of the values, or a `Map` keyed by the value that the loop compares, one time. Read it inside the loop.',
      searchInLoop:
        'This `for...of` searches `{{receiver}}` for a value on each pass of the loop around it, so the work grows with the product of both sizes. Before the outer loop, build a `Set` of the values, or a `Map` keyed by the value that the inner loop compares, one time. Read it inside the loop.',
    },
  },
  create(context) {
    const { checker, sourceFile } = context

    function isArray(node: Node): boolean {
      const type = checker.getTypeAtLocation(node)
      const present = type === undefined ? undefined : checker.getNonNullableType(type)
      return present !== undefined && (checker.isArrayType(present) || checker.isTupleType(present))
    }

    /** Whether the call is the callback argument of an array method that calls it once for each element. */
    function isIteratingCall(call: Node, callback: Node): boolean {
      if (!isCallExpression(call) || call.arguments[0] !== callback || !isCallback(callback)) return false
      const callee = unwrap(call.expression)
      return isPropertyAccessExpression(callee) && isIdentifier(callee.name) && ITERATING.has(callee.name.text) && isArray(callee.expression)
    }

    /** The nearest loop or iterating callback whose repeating part holds the node, or `undefined` outside of each. */
    function repeatingContextOf(node: Node): Node | undefined {
      let child = node
      for (let parent = child.parent; !isSourceFile(child); child = parent, parent = parent.parent) {
        if (repeatsIn(parent, child)) return parent
        if (isIteratingCall(parent, child)) return child
      }
      return undefined
    }

    /** Whether the root of the receiver is declared outside of the repeating context, so that one index can serve each pass. */
    function declaredOutside(root: Node, repeating: Node): boolean {
      if (root.kind === SyntaxKind.ThisKeyword) return true
      const symbol = checker.getSymbolAtLocation(root)
      const declaration = (symbol?.valueDeclaration ?? symbol?.declarations[0])?.resolve()
      if (declaration === undefined) return false
      if (declaration.getSourceFile().fileName !== sourceFile.fileName) return true
      return declaration.pos < repeating.pos || declaration.end > repeating.end
    }

    function check(call: CallExpression): void {
      const callee = unwrap(call.expression)
      if (!isPropertyAccessExpression(callee) || !isIdentifier(callee.name)) return
      const method = callee.name.text
      if (!VALUE_LOOKUPS.has(method) && !(PREDICATE_LOOKUPS.has(method) && isEqualityPredicate(call.arguments[0]))) return

      const root = rootOf(callee.expression)
      if (root === undefined || !isArray(callee.expression)) return
      const repeating = repeatingContextOf(call)
      if (repeating === undefined || !declaredOutside(root, repeating)) return

      context.report({ node: call, messageId: 'lookupInLoop', data: { receiver: callee.expression.getText(sourceFile), method } })
    }

    /** A `for...of` over an array, inside a loop, whose body compares an element to a value: the search that `includes` or `find` does. */
    function checkSearch(loop: ForOfStatement): void {
      const root = rootOf(loop.expression)
      if (root === undefined || !isArray(loop.expression)) return
      const repeating = repeatingContextOf(loop)
      if (repeating === undefined || !declaredOutside(root, repeating)) return
      const names = elementNames(loop)
      if (names.size === 0 || !searchesForValue(loop.statement, names)) return

      context.report({ node: loop, messageId: 'searchInLoop', data: { receiver: loop.expression.getText(sourceFile) } })
    }

    return {
      [SyntaxKind.CallExpression]: (node) => {
        if (isCallExpression(node)) check(node)
      },
      [SyntaxKind.ForOfStatement]: (node) => {
        if (isForOfStatement(node)) checkSearch(node)
      },
    }
  },
}
