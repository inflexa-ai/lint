import type { TSESLint } from '@typescript-eslint/utils'
import ts from 'typescript'
import { indirectionOf } from '@inflexa-ai/oxlint-plugin/helpers/reflective-calls'
import { typeInformationOf } from '@inflexa-ai/oxlint-plugin/helpers/type-information'

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
 * written `['billing', orgId] as const`, and that is the same array literal as
 * the one without the assertion.
 */
function withoutAssertions(node: ts.Expression): ts.Expression {
  let value = node
  while (
    ts.isAsExpression(value) ||
    ts.isSatisfiesExpression(value) ||
    ts.isNonNullExpression(value) ||
    ts.isTypeAssertionExpression(value) ||
    ts.isParenthesizedExpression(value)
  ) {
    value = value.expression
  }
  return value
}

/**
 * A key belongs to the module that owns the resource. `billingQueries.all(orgId)`
 * is that key, and a caller that writes `['billing', orgId]` out again holds a
 * second copy of it. The day the data module changes its key, the copy goes on
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
 * object's `invalidateQueries`. Without a program there is no type to ask, and
 * the rule stops the run rather than falling back to a name.
 *
 * Only an array literal is reported. A factory call, a variable and an entry's
 * `.queryKey` each have one owner, which is the arrangement this protects.
 *
 * A method reached reflectively hides the key behind an argument list, where an
 * inline key and a key from a factory look the same. `indirectionOf` decides
 * which shapes those are and why each one counts.
 */
export const noInlineQueryKey: TSESLint.RuleModule<'indirectCall' | 'inlineQueryKey'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Take a query key from the data module that owns the resource',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-inline-query-key.md',
    },
    schema: [],
    messages: {
      indirectCall:
        'This call goes through `{{through}}`, where the arguments cannot be read, so nothing here can tell whether the key came from a factory or was written out at the call. Call the method directly, `queryClient.invalidateQueries({ queryKey: billingQueries.all(orgId) })`: app code has no need for the indirection, and reaching for it is how a second copy of a key gets past this rule.',
      inlineQueryKey:
        'This key is written out at the call, which makes a second copy of a key the resource\'s data module already owns. The day that module changes its key, this call matches nothing and no test fails, because a filter that matches no entry is not a failure. Take the key from the factory in `apps/<app>/src/data/<resource>.ts`: an entry\'s own `.queryKey` for one query, `billingQueries.usage(orgId, bcId).queryKey`, and the key-only `all` entry for the prefix that covers the resource, `billingQueries.all(orgId)`. A literal that spreads a factory call and adds elements after it, `[...billingQueries.all(orgId), "usage"]`, is the same copy: the elements after the spread are the half that drifts. A prefix no entry yields yet is an entry that data module gains.',
    },
  },
  create(context) {
    const { program, esTreeNodeToTSNodeMap, tsNodeToESTreeNodeMap } = typeInformationOf(context)
    const checker = program.getTypeChecker()

    /** Whether the method this call resolved to is declared on the cache or on its client. */
    function ownedByCache(signature: ts.Signature): boolean {
      const declaration = signature.declaration
      if (declaration === undefined) return false

      const owner = declaration.parent
      if (!ts.isClassDeclaration(owner) || owner.name === undefined || !CACHE_OWNERS.has(owner.name.text)) return false
      return owner.getSourceFile().fileName.includes(QUERY_CORE)
    }

    /** Whether anything this value can be called as is a method of the cache or of its client. */
    function reachesCache(node: ts.Node): boolean {
      return checker
        .getTypeAtLocation(node)
        .getCallSignatures()
        .some((candidate) => ownedByCache(candidate))
    }

    /** The key written inside a filters or an options argument, when it was written there. */
    function carriedKeyOf(parameter: ts.Symbol, argument: ts.Expression): ts.Expression | undefined {
      if (!parameter.valueDeclaration) return undefined
      const declared = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(parameter, parameter.valueDeclaration))
      if (checker.getPropertyOfType(declared, 'queryKey') === undefined) return undefined

      const object = withoutAssertions(argument)
      const written = checker.getPropertyOfType(checker.getTypeAtLocation(object), 'queryKey')?.valueDeclaration
      // The property has to belong to this argument's own literal. Reached
      // through a spread, `{ ...filters }`, it is declared in another object and
      // possibly another file, and that object is where a reader would have to
      // be sent instead. A shorthand property fails the same check and is a
      // variable anyway.
      if (!written || !ts.isPropertyAssignment(written) || written.parent !== object) return undefined
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
    function keyOf(call: ts.CallExpression, signature: ts.Signature): ts.Expression | undefined {
      const args = call.arguments
      // A spread argument stands for an unknown number of values, thus no
      // position after it is the parameter the signature says it is.
      const spreadAt = args.findIndex((argument) => ts.isSpreadElement(argument))
      const limit = spreadAt === -1 ? args.length : spreadAt

      for (const [at, parameter] of signature.getParameters().entries()) {
        if (at >= limit) return undefined

        // The name is the library's own, declared in its types, and not a
        // convention at the call. Reading the type instead would report
        // `setQueryData(key, ['a', 'b'])`, whose second argument is the data.
        if (parameter.getName() === 'queryKey') return withoutAssertions(args[at])

        const carried = carriedKeyOf(parameter, args[at])
        if (carried !== undefined) return carried
      }
      return undefined
    }

    return {
      CallExpression(node) {
        const call = esTreeNodeToTSNodeMap.get(node)
        const signature = checker.getResolvedSignature(call)
        if (!signature) return

        const through = indirectionOf(call, signature, reachesCache)
        if (through !== undefined) {
          context.report({ node, messageId: 'indirectCall', data: { through } })
          return
        }

        if (!ownedByCache(signature)) return

        const key = keyOf(call, signature)
        if (key === undefined || !ts.isArrayLiteralExpression(key)) return

        context.report({ node: tsNodeToESTreeNodeMap.get(key), messageId: 'inlineQueryKey' })
      },
    }
  },
}
