import { exportedName, type Identifier, isGlobalIdentifier, staticMemberName, variableFor } from '@inflexa-ai/oxlint-plugin/helpers/static-names'
import type { ESTree, Rule } from '@oxlint/plugins'

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function

const SUBSCRIPTION_MEMBERS = new Set(['on', 'addEventListener', 'setInterval'])
const SUBSCRIPTION_GLOBALS = new Set(['addEventListener', 'setInterval'])

function nearestFunction(node: ESTree.Node): FunctionNode | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression') {
      return current
    }
  }
  return undefined
}

/** The own name of a function, and the name of the variable that it initializes. */
function functionNames(node: FunctionNode): string[] {
  const names: string[] = []
  if (node.type !== 'ArrowFunctionExpression' && node.id) names.push(node.id.name)
  if (node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') names.push(node.parent.id.name)
  return names
}

function isJsx(node: ESTree.Node | null): boolean {
  return node?.type === 'JSXElement' || node?.type === 'JSXFragment'
}

/**
 * A name in PascalCase, or a return of JSX. Unlike `prefer-onSettled-for-side-effects` of eslint-plugin-solid, a named
 * function expression is a component when either its own name or the name of its variable is in PascalCase.
 */
function isComponent(node: FunctionNode): boolean {
  if (functionNames(node).some((name) => /^[A-Z]/.test(name))) return true
  if (node.body === null) return false
  if (node.body.type !== 'BlockStatement') return isJsx(node.body)
  return node.body.body.some((statement) => statement.type === 'ReturnStatement' && isJsx(statement.argument))
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
export const requireCleanup: Rule = {
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
    const subscriptions = new Map<FunctionNode, ESTree.CallExpression[]>()
    const cleaned = new Set<FunctionNode>()

    /** The import specifier of solid-js that binds an identifier, where the scope resolves it to one. */
    function solidImportOf(node: Identifier): ESTree.Node | undefined {
      const def = variableFor(sourceCode, node)?.defs.find((candidate) => candidate.type === 'ImportBinding')
      if (def?.parent?.type !== 'ImportDeclaration' || def.parent.source.value !== 'solid-js') return undefined
      return def.node
    }

    function isSubscription({ callee }: ESTree.CallExpression): boolean {
      if (callee.type === 'MemberExpression') {
        const name = staticMemberName(callee)
        if (name === undefined || !SUBSCRIPTION_MEMBERS.has(name)) return false
        // `Solid.on` is the helper of Solid that makes a tracked callback, not an emitter.
        return callee.object.type !== 'Identifier' || solidImportOf(callee.object)?.type !== 'ImportNamespaceSpecifier'
      }
      return callee.type === 'Identifier' && SUBSCRIPTION_GLOBALS.has(callee.name) && isGlobalIdentifier(sourceCode, callee)
    }

    function isCleanup({ callee }: ESTree.CallExpression): boolean {
      if (callee.type === 'Identifier') {
        const specifier = solidImportOf(callee)
        return specifier?.type === 'ImportSpecifier' && exportedName(specifier.imported) === 'onCleanup'
      }
      if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier' || staticMemberName(callee) !== 'onCleanup') return false
      return solidImportOf(callee.object)?.type === 'ImportNamespaceSpecifier'
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
