import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

/** The name a key stands for, written plainly or as a literal in brackets. */
function keyName(key: TSESTree.Node, computed: boolean): string | undefined {
  if (!computed) {
    if (key.type === AST_NODE_TYPES.Identifier) return key.name
    return key.type === AST_NODE_TYPES.Literal && typeof key.value === 'string' ? key.value : undefined
  }
  return key.type === AST_NODE_TYPES.Literal && typeof key.value === 'string' ? key.value : undefined
}

function propertyFor(pattern: TSESTree.ObjectExpression | TSESTree.ObjectPattern, name: string): TSESTree.Property | undefined {
  const properties: TSESTree.Node[] = pattern.properties
  return properties.filter((property) => property.type === AST_NODE_TYPES.Property).find((property) => keyName(property.key, property.computed) === name)
}

function hasProperty(object: TSESTree.ObjectExpression | TSESTree.ObjectPattern, name: string): boolean {
  return propertyFor(object, name) !== undefined
}

/** The local a destructured property binds, seen through a default value. */
function boundName(property: TSESTree.Property): string | undefined {
  const bound = property.value.type === AST_NODE_TYPES.AssignmentPattern ? property.value.left : property.value
  return bound.type === AST_NODE_TYPES.Identifier ? bound.name : undefined
}

/**
 * The reads of a name declared in this scope.
 *
 * Through the scope rather than by walking the body: a reference from a
 * callback nested three deep resolves to the same variable, so reading the
 * signal anywhere inside counts.
 */
function readsOf(scope: TSESLint.Scope.Scope, name: string): TSESLint.Scope.Reference[] {
  const variable = scope.variables.find((candidate) => candidate.name === name)
  return variable?.references.filter((reference) => reference.isRead()) ?? []
}

/**
 * Whether the query function reads the `signal` its first argument carries.
 *
 * Both halves ask the same question of the scope: is the signal read. A
 * destructured `signal` that the body never mentions again has taken the signal
 * out of the context and dropped it, which leaves the request as uncancellable
 * as one that never asked for it. Counting the pattern instead of the reads
 * would call that function correct.
 */
function readsSignal(parameter: TSESTree.Parameter, scope: TSESLint.Scope.Scope): boolean {
  if (parameter.type === AST_NODE_TYPES.ObjectPattern) {
    const property = propertyFor(parameter, 'signal')
    const local = property === undefined ? undefined : boundName(property)
    return local !== undefined && readsOf(scope, local).length > 0
  }
  if (parameter.type !== AST_NODE_TYPES.Identifier) return false

  return readsOf(scope, parameter.name).some((reference) => {
    const parent = reference.identifier.parent
    return parent.type === AST_NODE_TYPES.MemberExpression && keyName(parent.property, parent.computed) === 'signal'
  })
}

/**
 * A query library cancels a query by aborting the signal it hands the query
 * function, and only that signal. A function that ignores it keeps fetching
 * after the component that asked is gone, and writes the answer into the cache;
 * a deadline of its own satisfies `require-abort-signal` and cancels nothing on
 * unmount, which is why this is a rule and not a convention.
 *
 * What makes an object a query is a `queryKey` beside the `queryFn`, and that
 * is what this rule looks for, wherever the object is written: in a hook call,
 * in `queryOptions`, as a `useQueries` entry, or in a variable passed to a hook
 * later. Matching the name of the enclosing call instead was wrong in both
 * directions: an options object built above the call escaped, and an unrelated
 * `database.query({ queryFn })` was reported, which with inline disables
 * forbidden is an expensive thing to be wrong about.
 *
 * A `queryKey` that arrives through a spread, `{ ...base, queryFn }`, is not
 * the pair and is left alone. The property is declared in another object and
 * possibly another file, and without it there is nothing here to tell a query
 * from the unrelated `database.query({ queryFn })` that must stay silent.
 *
 * `@typescript-eslint/no-unused-vars` reports the dropped signal too, as a
 * variable nobody uses. That reading sends the author the wrong way: the fix it
 * suggests is to delete the destructure, and the fix is to pass the signal on.
 *
 * Only a function written in place is read. A `queryFn` that names a function
 * declared elsewhere is left to `require-abort-signal` and to the types at that
 * function's own leaf: following the name is dataflow, which the compiler
 * already does better.
 */
export const useQuerySignal: TSESLint.RuleModule<'ignoredSignal'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Use the signal a query library hands the query function',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/use-query-signal.md',
    },
    schema: [],
    messages: {
      ignoredSignal:
        'This query function ignores the `signal` its first argument carries, so nothing cancels the request when the component unmounts and its answer still reaches the cache. Read it, `({ signal }) => …`, and pass it on to the call. To bound the request as well, combine them: `AbortSignal.any([signal, AbortSignal.timeout(ms)])`.',
    },
  },
  create(context) {
    return {
      Property(node) {
        const queryFn = node.value
        if (keyName(node.key, node.computed) !== 'queryFn' || (queryFn.type !== AST_NODE_TYPES.ArrowFunctionExpression && queryFn.type !== AST_NODE_TYPES.FunctionExpression))
          return

        const object = node.parent
        if (object.type !== AST_NODE_TYPES.ObjectExpression || !hasProperty(object, 'queryKey')) return

        const parameter = queryFn.params[0]
        if (queryFn.params.length > 0 && readsSignal(parameter, context.sourceCode.getScope(queryFn))) return

        context.report({ node: queryFn, messageId: 'ignoredSignal' })
      },
    }
  },
}
