import type { ESTree, Rule, Variable } from '@oxlint/plugins'
import { unwrapTypeAssertions } from '@inflexa-ai/oxlint-plugin/helpers/expressions'
import { type Identifier, variableFor } from '@inflexa-ai/oxlint-plugin/helpers/static-names'

const SUFFIX = '_CLASSES'

// The names of the default callee selectors of eslint-plugin-better-tailwindcss.
// The rule cannot import the plugin, which is an optional peer. The test of the
// Tailwind preset compares this set with the defaults of the installed plugin.
export const CLASS_CALLEES = new Set(['cc', 'clb', 'clsx', 'cn', 'cnb', 'ctl', 'cva', 'cx', 'dcnb', 'objstr', 'tv', 'twJoin', 'twMerge'])

const CLASS_ATTRIBUTES = new Set(['class', 'className'])

// The default variable selectors of the plugin match these names with a string value only.
const DEFAULT_NAMES = /^(?:classNames?|classes|styles?)$/

/** The identifiers at the root of each value that an expression can put into a class position. */
function rootsOf(node: ESTree.Node): Identifier[] {
  const value = unwrapTypeAssertions(node)
  switch (value.type) {
    case 'Identifier':
      return [value]
    case 'MemberExpression':
      return rootsOf(value.object)
    case 'ChainExpression':
    case 'SpreadElement':
      return rootsOf(value.type === 'ChainExpression' ? value.expression : value.argument)
    case 'ConditionalExpression':
      return [...rootsOf(value.consequent), ...rootsOf(value.alternate)]
    case 'LogicalExpression':
      return [...rootsOf(value.left), ...rootsOf(value.right)]
    case 'TemplateLiteral':
      return value.expressions.flatMap(rootsOf)
    case 'ArrayExpression':
      return value.elements.flatMap((element) => (element ? rootsOf(element) : []))
    default:
      return []
  }
}

/** The value of a module `const` that can hold classes, or `undefined` for each other variable. */
function moduleConstantValue(variable: Variable): ESTree.Expression | undefined {
  if (variable.scope.type !== 'module' && variable.scope.type !== 'global') return undefined
  const def = variable.defs.at(0)
  if (def?.node.type !== 'VariableDeclarator' || def.parent?.type !== 'VariableDeclaration' || def.parent.kind !== 'const' || def.node.init === null) return undefined
  const value = unwrapTypeAssertions(def.node.init)
  const holdsClasses = (value.type === 'Literal' && typeof value.value === 'string') || value.type === 'TemplateLiteral' || value.type === 'ObjectExpression'
  return holdsClasses ? value : undefined
}

function constantCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()
}

/**
 * The Tailwind rules lint a constant by its name only: the preset adds the
 * names that end in `_CLASSES` to the default names of the plugin. A constant
 * with another name that goes into a class position carries classes that no
 * Tailwind rule reads.
 *
 * Reported: a module `const` with a string, template or object value, that
 * reaches a `class` or `className` attribute or an argument of a class
 * function such as `cn`, directly or as the root of a member expression. The
 * report is at the declaration, one time for each constant.
 *
 * Not reported: a local `const`, an imported constant, a value of another
 * kind, and a default name of the plugin with a value that is not an object.
 */
export const classConstantName: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Give a module constant that holds Tailwind classes a name that ends in _CLASSES',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/class-constant-name.md',
    },
    schema: [],
    messages: {
      rename: '`{{name}}` goes into a class position, but the Tailwind rules lint a constant only by its name. Rename it to `{{expected}}`, so that they lint its classes.',
    },
  },
  create(context) {
    const { sourceCode } = context
    const seen = new Set<Variable>()

    function check(node: ESTree.Node): void {
      for (const root of rootsOf(node)) {
        const variable = variableFor(sourceCode, root)
        if (!variable || seen.has(variable)) continue
        seen.add(variable)

        const value = moduleConstantValue(variable)
        const { name } = variable
        if (!value || name.endsWith(SUFFIX) || (DEFAULT_NAMES.test(name) && value.type !== 'ObjectExpression')) continue
        context.report({ node: variable.identifiers[0] ?? root, messageId: 'rename', data: { name, expected: `${constantCase(name)}${SUFFIX}` } })
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !CLASS_ATTRIBUTES.has(node.name.name)) return
        if (node.value?.type === 'JSXExpressionContainer' && node.value.expression.type !== 'JSXEmptyExpression') check(node.value.expression)
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !CLASS_CALLEES.has(node.callee.name)) return
        for (const argument of node.arguments) check(argument)
      },
    }
  },
}
