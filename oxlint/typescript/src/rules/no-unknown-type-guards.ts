import type { Rule } from '@oxlint/plugins'
import { type GuardFunction, guardKind } from '../helpers/type-guards.ts'

// The selectors of the nodes of `GuardFunction`.
const FUNCTIONS = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'TSDeclareFunction', 'TSEmptyBodyFunctionExpression']

function functionName(node: GuardFunction): string {
  if (node.id) return node.id.name
  const { parent } = node
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name
  if ((parent.type === 'Property' || parent.type === 'MethodDefinition') && parent.key.type === 'Identifier') return parent.key.name
  return 'This function'
}

/**
 * `function isRecord(value: unknown): value is Record<string, unknown>` and its
 * many cousins are validators written by hand, one call site at a time. Each
 * checks what its author remembered to check, nothing ties it to the type it
 * claims, and the same guard gets declared again in the next file that needs it.
 *
 * Data whose type is not known enters the program at a boundary (a response, a
 * message, storage, a URL). It is parsed there, once, by a schema that is also
 * the source of the type; everything inward receives typed data and has
 * nothing left to guard.
 *
 * Only guards over a type of any shape are reported: `unknown`, `any`,
 * `object`, `{}`, a `Record` of one of these, and a parameter with no type. A
 * callback that is a call argument takes the type of its parameter from the
 * call, so it is not untyped. A guard that narrows a known union (`part is
 * ToolCall` out of `ChatPart`) is the concern of `require-assertion-safety`.
 */
export const noUnknownTypeGuards: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Parse unknown data with a schema instead of a hand-written type guard',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-unknown-type-guards.md',
    },
    schema: [],
    messages: {
      unknownGuard:
        '`{{name}}` is a hand-written validator for untyped data: it checks what its author thought of, and nothing keeps it in step with the type it claims. Describe the shape once as a zod schema, parse where the data enters the program (`schema.parse` or `safeParse`), and pass the typed result inward; `z.infer` gives the type. A wide type such as `object`, `{}` or `Record<string, unknown>` is the same untyped data.',
    },
  },
  create(context) {
    function check(node: GuardFunction): void {
      if (node.returnType && guardKind(node) === 'untyped') {
        context.report({ node: node.returnType, messageId: 'unknownGuard', data: { name: functionName(node) } })
      }
    }

    return Object.fromEntries(FUNCTIONS.map((type) => [type, check]))
  },
}
