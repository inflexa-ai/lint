import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import ts from 'typescript'
import { indirectionOf } from '../helpers/reflective-calls.ts'
import { typeInformationOf } from '../helpers/type-information.ts'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { declaredIn: string[] }

const DEFAULTS: Options = { declaredIn: [] }

/** The name a declaration carries, when it has one at all: a call signature does not. */
function declarationName(declaration: ts.SignatureDeclaration | ts.JSDocSignature): string | undefined {
  const name = 'name' in declaration ? declaration.name : undefined
  return name && 'text' in name && typeof name.text === 'string' ? name.text : undefined
}

/**
 * A request nobody can end outlives whatever asked for it: a query function
 * that forgets its signal keeps fetching after its component is gone and writes
 * the answer into the cache, and a throttled call sits through a wait of up to
 * thirty seconds per attempt that nothing can cut short.
 *
 * The call is recognised by where its signature is declared, not by what the
 * variable holding the client is called. A client is built once and passed
 * around under whatever name the feature gives it, so a rule that matched
 * `api.get` would miss `org.get` and would report `map.get`.
 *
 * Only the leaf is checked. A wrapper whose own `signal` is optional is
 * reported inside it, and the moment it declares `signal: AbortSignal` the
 * compiler makes every caller supply one; the obligation then climbs, by
 * ordinary types, to a query's context, a loader's controller or a deadline.
 */
export const requireAbortSignal: TSESLint.RuleModule<'indirectCall' | 'missingSignal', [Partial<Options>]> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require an AbortSignal on every call into the API client and on every fetch',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/require-abort-signal.md',
    },
    schema: [
      {
        type: 'object',
        properties: { declaredIn: { type: 'array', items: { type: 'string' }, uniqueItems: true } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      indirectCall:
        'This call goes through `{{through}}`, where the options cannot be read, so nothing here can tell whether the request carries a `signal`. Call the method directly, `api.get(path, { signal })`: app code has no need for the indirection, and reaching for it is how a request ends up with nothing to cancel it.',
      missingSignal:
        'This call cannot be cancelled: {{problem}}. Pass a `signal` typed `AbortSignal`, not `AbortSignal | undefined`. Inside a query function it is the `signal` of the context the library hands you. Where nothing can cancel the call, a mutation among them, it is a deadline: `AbortSignal.timeout(ms)`. Where both exist, combine them with `AbortSignal.any([signal, AbortSignal.timeout(ms)])`. A wrapper declares `signal: AbortSignal` in its own options and the compiler asks its callers.',
    },
  },
  create(context) {
    const { program, esTreeNodeToTSNodeMap } = typeInformationOf(context)
    const { declaredIn } = { ...DEFAULTS, ...context.options[0] }

    // With no pattern to match there is no client to recognise.
    if (declaredIn.length === 0) return {}

    const checker = program.getTypeChecker()
    const clientFiles = declaredIn.map((pattern) => new RegExp(pattern))

    /** The type of the last thing a signature takes, with any `undefined` of an optional parameter removed. */
    function optionsTypeOf(signature: ts.Signature): ts.Type | undefined {
      const parameters = signature.getParameters()
      const last = parameters[parameters.length - 1]
      if (parameters.length === 0 || !last.valueDeclaration) return undefined
      return checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(last, last.valueDeclaration))
    }

    /**
     * Whether this call is one that carries a request, which is true when its
     * signature both comes from somewhere that matters and takes something a
     * signal can travel in. The second half is what keeps `withPrefix(prefix)`
     * and the client factories out: they are declared in the same file and have
     * nowhere to put one.
     */
    function signatureIsTarget(signature: ts.Signature): boolean {
      const declaration = signature.declaration
      if (declaration === undefined) return false
      const source = declaration.getSourceFile()

      // A `fetch` is recognised by the name of its declaration in a declaration
      // file, not by which file that is: the platform's, a polyfill's and a
      // library's all share the name and the shape, and each honours a
      // `signal`, so the name is the right key. `map.get` is declared in a
      // library too, which is why the name and not the file decides.
      const named = source.isDeclarationFile && declarationName(declaration) === 'fetch'
      if (!named && !clientFiles.some((pattern) => pattern.test(source.fileName))) return false

      const options = optionsTypeOf(signature)
      return options !== undefined && checker.getPropertyOfType(options, 'signal') !== undefined
    }

    /** Whether anything this value can be called as is a target. */
    function typeIsTarget(node: ts.Node): boolean {
      return checker
        .getTypeAtLocation(node)
        .getCallSignatures()
        .some((signature) => signatureIsTarget(signature))
    }

    /** What is wrong with the options this call was given, or `undefined` when nothing is. */
    function problemWith(node: TSESTree.CallExpression, signature: ts.Signature): string | undefined {
      const at = signature.getParameters().length - 1
      const argument = node.arguments[at]
      if (at < 0 || at >= node.arguments.length) return 'it was given no options to put one in'

      const type = checker.getTypeAtLocation(esTreeNodeToTSNodeMap.get(argument))
      // An untyped options object says nothing about a signal, and nothing is
      // not the same as one.
      if ((type.flags & ts.TypeFlags.Any) !== 0) return 'its options are typed `any`, which promises no `signal` at all'

      const signal = checker.getPropertyOfType(type, 'signal')
      if (signal === undefined) return 'its options carry no `signal`'

      // Optional here, or a union with `undefined` or `null`: either way the
      // call may go out with nothing to cancel it, and the leaf is where that
      // has to be settled.
      if ((signal.flags & ts.SymbolFlags.Optional) !== 0) return 'its `signal` is optional, so it may be missing'

      const signalType = checker.getTypeOfSymbolAtLocation(signal, esTreeNodeToTSNodeMap.get(argument))
      if (signalType === checker.getNonNullableType(signalType)) return undefined

      // Which of the two it is, because `RequestInit` allows `null` and a
      // reader who is told `undefined` will check for the wrong one.
      const parts = signalType.isUnion() ? signalType.types : [signalType]
      const absent = [
        parts.some((part) => (part.flags & ts.TypeFlags.Null) !== 0) ? '`null`' : undefined,
        parts.some((part) => (part.flags & ts.TypeFlags.Undefined) !== 0) ? '`undefined`' : undefined,
      ].filter((word) => word !== undefined)
      return `its \`signal\` may be ${absent.join(' or ')}`
    }

    return {
      CallExpression(node) {
        const call = esTreeNodeToTSNodeMap.get(node)
        const signature = checker.getResolvedSignature(call)
        if (!signature) return

        // Through an indirection the options are an argument list this rule
        // cannot read, so a call that carries a signal and one that does not
        // look alike. `indirectionOf` says which shapes those are and why.
        const through = indirectionOf(call, signature, typeIsTarget)
        if (through !== undefined) {
          context.report({ node, messageId: 'indirectCall', data: { through } })
          return
        }

        if (!signatureIsTarget(signature)) return

        const problem = problemWith(node, signature)
        if (problem !== undefined) context.report({ node, messageId: 'missingSignal', data: { problem } })
      },
    }
  },
}
