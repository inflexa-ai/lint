import type { ESTree, Rule } from '@oxlint/plugins'
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

/**
 * A parameter typed `unknown` moves the work of parsing inward, to every caller
 * and to the body that now has to narrow the value before it can read it. The
 * value entered the program somewhere with a known shape, and that boundary is
 * where a zod schema turns it into a domain type; a function that takes the
 * parsed type states what it needs and trusts it.
 *
 * `cause` is the exception, because an error's cause is an arbitrary thrown
 * value by contract and stays `unknown` on purpose. A request body and a value
 * to serialise are `unknown` exactly where data crosses in; those boundary
 * files belong to the consumer repository, so the consumer excludes them from
 * this rule in its own lint config.
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
        '`{{name}}` is typed `unknown`, which leaves the value unparsed for the body and every caller to narrow. Take the type the value has once it is parsed. Data whose shape is not known is parsed with a zod schema where it enters the program, and the typed result is passed inward. An error `cause` is the one `unknown` this rule allows.',
    },
  },
  create(context) {
    function check(node: FunctionLike): void {
      for (const parameter of node.params) {
        const annotation = annotationOf(parameter)
        if (annotation?.typeAnnotation.type !== 'TSUnknownKeyword') continue
        const name = nameOf(parameter)
        if (name === 'cause') continue
        context.report({ node: annotation.typeAnnotation, messageId: 'unknownParameter', data: { name } })
      }
    }

    return Object.fromEntries(FUNCTIONS.map((type) => [type, check]))
  },
}
