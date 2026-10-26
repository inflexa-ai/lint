import type { ESTree, Rule, SourceCode } from '@oxlint/plugins'
import { staticMemberName } from '../helpers/static-names.ts'
import { FUNCTIONS, type FunctionLike } from '../helpers/type-annotations.ts'

/** A parameter, and each form that a parameter wraps. */
type ParameterLike = ESTree.ParamPattern | ESTree.BindingPattern

/** The type annotation a parameter carries, seen through a rest, a default or a constructor property. */
function annotationOf(parameter: ParameterLike): ESTree.TSTypeAnnotation | undefined {
  if (parameter.type === 'TSParameterProperty') return annotationOf(parameter.parameter)
  if (parameter.type === 'RestElement') return parameter.typeAnnotation ?? annotationOf(parameter.argument)
  if (parameter.type === 'AssignmentPattern') return parameter.typeAnnotation ?? annotationOf(parameter.left)
  return 'typeAnnotation' in parameter ? (parameter.typeAnnotation ?? undefined) : undefined
}

/** The name a parameter binds, for the message, seen through the same wrappers. */
function nameOf(parameter: ParameterLike): string {
  if (parameter.type === 'TSParameterProperty') return nameOf(parameter.parameter)
  if (parameter.type === 'RestElement') return nameOf(parameter.argument)
  if (parameter.type === 'AssignmentPattern') return nameOf(parameter.left)
  return parameter.type === 'Identifier' ? parameter.name : 'a parameter'
}

/** Whether a function is the callback that a promise calls with a rejection: `.catch(f)` or `.then(_, f)`. */
function isRejectionCallback(node: FunctionLike): boolean {
  const { parent } = node
  if (parent.type !== 'CallExpression' || parent.callee.type !== 'MemberExpression') return false
  const method = staticMemberName(parent.callee)
  return (method === 'catch' && parent.arguments[0] === node) || (method === 'then' && parent.arguments[1] === node)
}

/** Whether a reference to a parameter is the `cause` option of an error that the code constructs: `new X(..., { cause })` or `super(..., { cause })`. */
function isErrorCauseOption(reference: ESTree.Node): boolean {
  const property = reference.parent
  if (property?.type !== 'Property' || property.value !== reference || property.computed) return false
  if (property.key.type !== 'Identifier' || property.key.name !== 'cause') return false
  const options = property.parent
  const call = options.parent
  if (call?.type === 'NewExpression') return call.arguments.some((argument) => argument === options)
  return call?.type === 'CallExpression' && call.callee.type === 'Super' && call.arguments.some((argument) => argument === options)
}

/** Whether a function passes its parameter `cause` on as the cause of an error. */
function passesErrorCause(sourceCode: SourceCode, node: FunctionLike): boolean {
  const cause = sourceCode.getDeclaredVariables(node).find((variable) => variable.name === 'cause')
  return cause?.references.some((reference) => isErrorCauseOption(reference.identifier)) ?? false
}

/**
 * A parameter typed `unknown` moves the work of parsing inward, to every caller
 * and to the body that now has to narrow the value before it can read it. The
 * value entered the program somewhere with a known shape, and that boundary is
 * where a zod schema turns it into a domain type; a function that takes the
 * parsed type states what it needs and trusts it.
 *
 * A thrown value is arbitrary by contract and stays `unknown` on purpose. Thus
 * the rule leaves alone the parameter of a rejection callback, and a `cause`
 * that the function passes on as the `cause` option of an error it constructs.
 * The name alone is not enough: `render(cause: unknown)` is the same unparsed
 * parameter under a lucky name. A request body and a value to serialise are
 * `unknown` exactly where data crosses in; those boundary files belong to the
 * consumer repository, so the consumer excludes them from this rule in its own
 * lint config.
 */
export const noUnknownParameters: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Take a parsed domain type as a parameter, not unknown',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-unknown-parameters.md',
    },
    schema: [],
    messages: {
      unknownParameter:
        '`{{name}}` is typed `unknown`, which leaves the value unparsed for the body and every caller to narrow. Take the type the value has once it is parsed. Data whose shape is not known is parsed with a zod schema where it enters the program, and the typed result is passed inward. A type parameter used one time is `unknown` under another name, and `typescript/no-unnecessary-type-parameters` reports it. Code that truly takes a value of any shape, such as a serializer or a logger, belongs in a boundary file that the zone of the repository leaves out. The rule lets a thrown value stay `unknown` only as the parameter of a rejection callback (`.catch`, or the second callback of `.then`), or as a `cause` that the function passes on as `{ cause }` to a new error.',
    },
  },
  create(context) {
    function check(node: FunctionLike): void {
      if (isRejectionCallback(node)) return
      for (const parameter of node.params) {
        const annotation = annotationOf(parameter)
        if (annotation?.typeAnnotation.type !== 'TSUnknownKeyword') continue
        const name = nameOf(parameter)
        if (name === 'cause' && passesErrorCause(context.sourceCode, node)) continue
        context.report({ node: annotation.typeAnnotation, messageId: 'unknownParameter', data: { name } })
      }
    }

    return Object.fromEntries(FUNCTIONS.map((type) => [type, check]))
  },
}
