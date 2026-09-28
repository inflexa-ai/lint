import type { ESTree, Rule } from '@oxlint/plugins'

/** The functions that can carry a type guard. */
type GuardFunction = ESTree.Function | ESTree.ArrowFunctionExpression

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
 * Only guards over `unknown`, `any` or an untyped parameter are reported. A
 * guard that narrows a known union (`part is ToolCall` out of `ChatPart`) states
 * a fact about types the program already has, and is left alone.
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
        '`{{name}}` is a hand-written validator for untyped data: it checks what its author thought of, and nothing keeps it in step with the type it claims. Describe the shape once as a zod schema, parse where the data enters the program (`schema.parse` or `safeParse`), and pass the typed result inward; `z.infer` gives the type. A guard that narrows a known union is fine.',
    },
  },
  create(context) {
    function check(node: GuardFunction): void {
      const { returnType } = node
      const predicate = returnType?.typeAnnotation
      if (!returnType || predicate?.type !== 'TSTypePredicate' || predicate.parameterName.type !== 'Identifier') return

      const { name } = predicate.parameterName
      const parameter = node.params.filter((param) => param.type === 'Identifier').find((param) => param.name === name)
      if (!parameter) return

      const type = parameter.typeAnnotation?.typeAnnotation.type
      if (type === undefined || type === 'TSUnknownKeyword' || type === 'TSAnyKeyword') {
        context.report({ node: returnType, messageId: 'unknownGuard', data: { name: functionName(node) } })
      }
    }

    return Object.fromEntries(FUNCTIONS.map((type) => [type, check]))
  },
}
