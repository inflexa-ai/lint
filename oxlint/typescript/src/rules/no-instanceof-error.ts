import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { globalReadOf } from '../helpers/static-names.ts'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { allowIn: string[] }

const DEFAULTS: Options = { allowIn: [] }

/**
 * `error instanceof Error ? error.message : String(error)` gets pasted into
 * every `catch` because a caught value is `unknown`. Most code has no reason to
 * look inside it:
 *
 * - to add context, rethrow with the original as the cause:
 *   `throw new UploadError('…', { cause })`;
 * - to handle a failure it understands, check for that specific class
 *   (`error instanceof ApiError`), which this rule leaves alone;
 * - TanStack Query already types `error` as `Error`.
 *
 * What remains is turning an arbitrary thrown value into an `Error` for a log
 * or a telemetry event. That is one function, and `allowIn` names the file it
 * lives in, so the normalising exists once instead of at every call site.
 *
 * The constructor is recognised by the binding it resolves to, which is what
 * makes `globalThis.Error`, `window.Error` and `self['Error']` the same finding
 * as the bare name, and what leaves a class of one's own that happens to be
 * called `Error` alone. Only a member chain is followed: `Error` copied into a
 * variable first is not reported, because nobody renames the one class every
 * program already has, and a rule that chased assignments would be a dataflow
 * analysis for a spelling that never appears.
 *
 * `Error.isError(value)` asks the same question across realms, and is reported
 * with `instanceof Error` however it is written: `Error['isError'](value)` and
 * `Error.isError?.(value)` too. It is ES2026, so the `lib` in tsconfig.base.json
 * cannot express it yet; covering it now means raising `lib` later does not
 * quietly open a second spelling of the check this rule keeps in one place.
 */
export const noInstanceofError: TSESLint.RuleModule<'errorCheck', [Partial<Options>]> = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Keep generic `instanceof Error` and `Error.isError` checks in one error-normalising module',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-instanceof-error.md',
    },
    schema: [
      {
        type: 'object',
        properties: { allowIn: { type: 'array', items: { type: 'string' }, uniqueItems: true } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      errorCheck:
        'A generic `{{check}}` check is how error normalising gets copied into every catch block. To add context, rethrow with `{ cause }`. To handle a failure you understand, check for its specific class (`instanceof ApiError`). Turning an arbitrary thrown value into an `Error` belongs in the one module listed under `allowIn` for this rule in oxlint.config.ts.',
    },
  },
  create(context) {
    const { allowIn } = { ...DEFAULTS, ...context.options[0] }
    if (allowIn.some((pattern) => new RegExp(pattern).test(context.filename))) return {}

    const { sourceCode } = context

    /** The check a node makes, named after the global it reads rather than after its spelling. */
    function checkAt(node: TSESTree.Node, global: string): boolean {
      return globalReadOf(sourceCode, node)?.name === global
    }

    return {
      BinaryExpression(node) {
        if (node.operator === 'instanceof' && checkAt(node.right, 'Error')) {
          context.report({ node, messageId: 'errorCheck', data: { check: 'instanceof Error' } })
        }
      },
      CallExpression(node) {
        if (checkAt(node.callee, 'Error.isError')) {
          context.report({ node, messageId: 'errorCheck', data: { check: 'Error.isError' } })
        }
      },
    }
  },
}
