import type { RuleModule } from '@inflexa-ai/typecheck'
import { indirectionOf } from '@inflexa-ai/typecheck/helpers/reflective-calls'
import {
  type CallExpression,
  type Expression,
  isArrayLiteralExpression,
  isAsExpression,
  isCallExpression,
  isClassDeclaration,
  isNonNullExpression,
  isParenthesizedExpression,
  isPropertyAssignment,
  isSatisfiesExpression,
  isSpreadElement,
  isTypeAssertion,
  type Node,
  SyntaxKind,
} from 'typescript/unstable/ast'
import { type Signature, SignatureKind, type Symbol as TypeSymbol } from 'typescript/unstable/sync'

/**
 * The package that declares the cache and the client over it, whatever
 * re-exports them. Written here rather than taken as an option, which is where
 * `require-abort-signal` keeps its `declaredIn`: that one names a folder of this
 * repository, which this repository can move, and this one names a published
 * package, which it cannot.
 */
const QUERY_CORE = '@tanstack/query-core/'

/**
 * The classes of that package whose methods reach the cache by key. The cache
 * is here beside the client because `queryClient.getQueryCache().findAll(…)`
 * takes the same filters and matches the same entries, and a rule that stopped
 * at the client would leave one spelling of the same call unreported.
 */
const CACHE_OWNERS = new Set(['QueryClient', 'QueryCache'])

/**
 * The value under the assertions written around it. A key is a tuple, so it is
 * written `['todos', id] as const`, and that is the same array literal as
 * the one without the assertion.
 */
function withoutAssertions(node: Expression): Expression {
  let value = node
  while (isAsExpression(value) || isSatisfiesExpression(value) || isNonNullExpression(value) || isTypeAssertion(value) || isParenthesizedExpression(value)) {
    value = value.expression
  }
  return value
}

/** Whether two nodes are one node of one file: a resolved handle and a node of the walk are separate objects. */
function sameNode(a: Node, b: Node): boolean {
  return a.kind === b.kind && a.pos === b.pos && a.end === b.end && a.getSourceFile().fileName === b.getSourceFile().fileName
}

/**
 * A key belongs to the factory that owns the resource. `todoQueries.all()` is
 * that key, and a caller that writes `['todos']` out again holds a second copy
 * of it. The day the factory changes its key, the copy goes on
 * matching nothing: the cache is never dropped, the screen keeps stale data, and
 * every test stays green, because a filter that matches no entry is not a
 * failure. The `Register` union already refuses a namespace the app never
 * declared, so the typo is a compile error; a key spelled right and duplicated
 * is what nothing else sees.
 *
 * The library's own `prefer-query-options` reports the same shape, and only on a
 * client the file it reads declares. An imported client is invisible to it, and
 * an imported client is what a route loader and an event handler use, because
 * those live outside a component and take the app's shared one. That is the code
 * most likely to reach the cache.
 *
 * The call is recognised by the class the compiler resolved the method on, which
 * is a fact about the receiver's type and not about its spelling. A rule that
 * matched a receiver named `queryClient` would miss `client`, would miss the
 * method pulled into a variable of its own, and would report an unrelated
 * object's `invalidateQueries`.
 *
 * Only an array literal is reported. A factory call, a variable and an entry's
 * `.queryKey` each have one owner, which is the arrangement this protects.
 *
 * A method reached reflectively hides the key behind an argument list, where an
 * inline key and a key from a factory look the same. `indirectionOf` decides
 * which shapes those are and why each one counts.
 */
export const noInlineQueryKey: RuleModule = {
  meta: {
    docs: {
      description: 'Take a query key from the factory that owns the resource',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-inline-query-key.md',
    },
    defaultOptions: {},
    messages: {
      indirectCall:
        'This call goes through `{{through}}`, where the arguments cannot be read, so nothing here can tell whether the key came from a factory or was written out at the call. Call the method directly, `queryClient.invalidateQueries({ queryKey: todoQueries.all() })`: app code has no need for the indirection, and reaching for it is how a second copy of a key gets past this rule.',
      inlineQueryKey:
        'This key is written out at the call, which makes a second copy of a key that the query key factory of the resource already owns. The day that factory changes its key, this call matches nothing and no test fails, because a filter that matches no entry is not a failure. Take the key from the factory: an entry\'s own `.queryKey` for one query, `todoQueries.detail(id).queryKey`, and the key-only `all` entry for the prefix that covers the resource, `todoQueries.all()`. A literal that spreads a factory call and adds elements after it, `[...todoQueries.all(), "done"]`, is the same copy: the elements after the spread are the half that drifts. A prefix no entry yields yet is an entry that the factory gains.',
    },
  },
  create(context) {
    const { checker } = context

    /**
     * Whether the method this call resolved to is declared on the cache or on
     * its client. The canonical path of the handle, in lower case on a file
     * system that ignores case, pre-filters before `resolve()` fetches the AST
     * of its file, and the file name decides.
     */
    function ownedByCache(signature: Signature): boolean {
      const handle = signature.declaration
      if (handle === undefined || !handle.path.toLowerCase().includes(QUERY_CORE)) return false
      const owner = handle.resolve()?.parent
      if (owner === undefined || !isClassDeclaration(owner) || owner.name === undefined || !CACHE_OWNERS.has(owner.name.text)) return false
      return owner.getSourceFile().fileName.includes(QUERY_CORE)
    }

    /** Whether anything this value can be called as is a method of the cache or of its client. */
    function reachesCache(node: Node): boolean {
      const type = checker.getTypeAtLocation(node)
      return type !== undefined && checker.getSignaturesOfType(type, SignatureKind.Call).some((candidate) => ownedByCache(candidate))
    }

    /** The key written inside a filters or an options argument, when it was written there. */
    function carriedKeyOf(parameter: TypeSymbol, argument: Expression): Expression | undefined {
      if (parameter.valueDeclaration === undefined) return undefined
      const parameterType = checker.getTypeOfSymbol(parameter)
      const declared = parameterType === undefined ? undefined : checker.getNonNullableType(parameterType)
      if (declared === undefined || checker.getPropertyOfType(declared, 'queryKey') === undefined) return undefined

      const object = withoutAssertions(argument)
      const objectType = checker.getTypeAtLocation(object)
      const written = objectType === undefined ? undefined : checker.getPropertyOfType(objectType, 'queryKey')?.valueDeclaration?.resolve()
      // The property has to belong to this argument's own literal. Reached
      // through a spread, `{ ...filters }`, it is declared in another object and
      // possibly another file, and that object is where a reader would have to
      // be sent instead. A shorthand property fails the same check and is a
      // variable anyway.
      if (written === undefined || !isPropertyAssignment(written) || !sameNode(written.parent, object)) return undefined
      return withoutAssertions(written.initializer)
    }

    /**
     * The node the key of this call was written as, read off the signature the
     * compiler resolved and not off a list of method names. The library declares
     * a parameter named `queryKey` where the key is the argument itself, and a
     * parameter whose type carries a `queryKey` property where it travels inside
     * a filters or an options object. Every method that takes a key is one of
     * the two shapes, so a method the library adds later is covered without a
     * change here.
     */
    function keyOf(call: CallExpression, signature: Signature): Expression | undefined {
      const args = call.arguments
      // A spread argument stands for an unknown number of values, thus no
      // position after it is the parameter the signature says it is.
      const spreadAt = args.findIndex((argument) => isSpreadElement(argument))
      const limit = spreadAt === -1 ? args.length : spreadAt

      for (const [at, parameter] of signature.getParameters().entries()) {
        const argument = args.at(at)
        if (at >= limit || argument === undefined) return undefined

        // The name is the library's own, declared in its types, and not a
        // convention at the call. Reading the type instead would report
        // `setQueryData(key, ['a', 'b'])`, whose second argument is the data.
        if (parameter.name === 'queryKey') return withoutAssertions(argument)

        const carried = carriedKeyOf(parameter, argument)
        if (carried !== undefined) return carried
      }
      return undefined
    }

    return {
      [SyntaxKind.CallExpression]: (call) => {
        if (!isCallExpression(call)) return
        const signature = checker.getResolvedSignature(call)
        if (signature === undefined) return

        const through = indirectionOf(call, signature, reachesCache)
        if (through !== undefined) {
          context.report({ node: call, messageId: 'indirectCall', data: { through } })
          return
        }

        if (!ownedByCache(signature)) return

        const key = keyOf(call, signature)
        if (key === undefined || !isArrayLiteralExpression(key)) return

        context.report({ node: key, messageId: 'inlineQueryKey' })
      },
    }
  },
}
