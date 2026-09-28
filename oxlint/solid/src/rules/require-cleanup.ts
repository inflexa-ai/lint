import { exportedName, isGlobalIdentifier, staticMemberName, variableFor } from '@inflexa-ai/oxlint-plugin/helpers/static-names'
import { AST_NODE_TYPES, TSESLint } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'

type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionDeclaration | TSESTree.FunctionExpression

const SUBSCRIPTION_MEMBERS = new Set(['on', 'addEventListener', 'setInterval'])
const SUBSCRIPTION_GLOBALS = new Set(['addEventListener', 'setInterval'])

function nearestFunction(node: TSESTree.Node): FunctionNode | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === AST_NODE_TYPES.ArrowFunctionExpression || current.type === AST_NODE_TYPES.FunctionDeclaration || current.type === AST_NODE_TYPES.FunctionExpression) {
      return current
    }
  }
  return undefined
}

/** The own name of a function, and the name of the variable that it initializes. */
function functionNames(node: FunctionNode): string[] {
  const names: string[] = []
  if (node.type !== AST_NODE_TYPES.ArrowFunctionExpression && node.id) names.push(node.id.name)
  if (node.parent.type === AST_NODE_TYPES.VariableDeclarator && node.parent.id.type === AST_NODE_TYPES.Identifier) names.push(node.parent.id.name)
  return names
}

function isJsx(node: TSESTree.Node | null): boolean {
  return node?.type === AST_NODE_TYPES.JSXElement || node?.type === AST_NODE_TYPES.JSXFragment
}

/**
 * A name in PascalCase, or a return of JSX. Unlike `prefer-onSettled-for-side-effects` of eslint-plugin-solid, a named
 * function expression is a component when either its own name or the name of its variable is in PascalCase.
 */
function isComponent(node: FunctionNode): boolean {
  if (functionNames(node).some((name) => /^[A-Z]/.test(name))) return true
  if (node.body.type !== AST_NODE_TYPES.BlockStatement) return isJsx(node.body)
  return node.body.body.some((statement) => statement.type === AST_NODE_TYPES.ReturnStatement && isJsx(statement.argument))
}

/**
 * A subscription in the body of a component lives as long as the program, not
 * as long as the component: nothing ends a listener or a timer when Solid
 * disposes of the owner of the component. `onCleanup` in the same body is what
 * ends it.
 *
 * The rule reads only the body of a component. A nested function has an owner
 * of its own: an effect runs again and needs its own cleanup, an element owns
 * the listeners of its `ref` callback, and an event handler runs with no owner.
 * A nested function that is itself a component, a render callback of `<For>`
 * for one, is checked on its own.
 *
 * One `onCleanup` satisfies each subscription of its function, because the rule
 * does not read what the cleanup does.
 */
export const requireCleanup: TSESLint.RuleModule<'missingCleanup'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Pair each subscription in the body of a component with an onCleanup',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/solid-require-cleanup.md',
    },
    schema: [],
    messages: {
      missingCleanup:
        '`{{callee}}` subscribes in the body of a component with no `onCleanup` of solid-js in the same function. Call `onCleanup` beside it, so that the subscription ends when the owner of the component is disposed.',
    },
  },
  create(context) {
    const { sourceCode } = context
    const subscriptions = new Map<FunctionNode, TSESTree.CallExpression[]>()
    const cleaned = new Set<FunctionNode>()

    /** The import specifier of solid-js that binds an identifier, where the scope resolves it to one. */
    function solidImportOf(node: TSESTree.Identifier): TSESTree.Node | undefined {
      const def = variableFor(sourceCode, node)?.defs.find((candidate) => candidate.type === TSESLint.Scope.DefinitionType.ImportBinding)
      if (def?.parent.type !== AST_NODE_TYPES.ImportDeclaration || def.parent.source.value !== 'solid-js') return undefined
      return def.node
    }

    function isSubscription({ callee }: TSESTree.CallExpression): boolean {
      if (callee.type === AST_NODE_TYPES.MemberExpression) {
        const name = staticMemberName(callee)
        if (name === undefined || !SUBSCRIPTION_MEMBERS.has(name)) return false
        // `Solid.on` is the helper of Solid that makes a tracked callback, not an emitter.
        return callee.object.type !== AST_NODE_TYPES.Identifier || solidImportOf(callee.object)?.type !== AST_NODE_TYPES.ImportNamespaceSpecifier
      }
      return callee.type === AST_NODE_TYPES.Identifier && SUBSCRIPTION_GLOBALS.has(callee.name) && isGlobalIdentifier(sourceCode, callee)
    }

    function isCleanup({ callee }: TSESTree.CallExpression): boolean {
      if (callee.type === AST_NODE_TYPES.Identifier) {
        const specifier = solidImportOf(callee)
        return specifier?.type === AST_NODE_TYPES.ImportSpecifier && exportedName(specifier.imported) === 'onCleanup'
      }
      if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.object.type !== AST_NODE_TYPES.Identifier || staticMemberName(callee) !== 'onCleanup') return false
      return solidImportOf(callee.object)?.type === AST_NODE_TYPES.ImportNamespaceSpecifier
    }

    function reportMissing(node: FunctionNode): void {
      if (cleaned.has(node)) return
      for (const call of subscriptions.get(node) ?? []) {
        context.report({ node: call, messageId: 'missingCleanup', data: { callee: sourceCode.getText(call.callee) } })
      }
    }

    return {
      CallExpression(node) {
        const owner = nearestFunction(node)
        if (owner === undefined || !isComponent(owner)) return
        if (isSubscription(node)) {
          const calls = subscriptions.get(owner) ?? []
          calls.push(node)
          subscriptions.set(owner, calls)
        } else if (isCleanup(node)) {
          cleaned.add(owner)
        }
      },
      'ArrowFunctionExpression:exit': reportMissing,
      'FunctionDeclaration:exit': reportMissing,
      'FunctionExpression:exit': reportMissing,
    }
  },
}
