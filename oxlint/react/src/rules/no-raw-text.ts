import type { ESTree, Rule } from '@oxlint/plugins'
import { optionObject, stringOption } from '@inflexa-ai/oxlint-plugin/helpers/rule-options'

/** The options of the rule, once oxlint has merged `meta.defaultOptions` into them. */
type Options = { hint: string }

const DEFAULTS: Options = { hint: '' }

// A letter of any script. Text without one, a separator or a number, reads the
// same in every language and has nothing to translate.
const LETTER = /\p{L}/u

// The attributes whose value a person reads, on screen or through assistive
// technology. Named rather than inferred: every other attribute of a JSX element
// carries a class, a URL, an id or a token, and a rule that reported all string
// attributes would need a list of exceptions that grows with each one.
const READ_ATTRIBUTES = new Set(['alt', 'aria-description', 'aria-label', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext', 'placeholder', 'title'])

/**
 * The strings an expression can put on the screen as it is written: a literal,
 * a template with nothing in it, and each branch of a conditional or of a
 * fallback that is one of those. Anything computed is left to the code that
 * computed it.
 */
function textsOf(node: ESTree.Node): string[] {
  if (node.type === 'Literal') return typeof node.value === 'string' ? [node.value] : []
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0 ? [node.quasis[0].value.cooked ?? ''] : []
  if (node.type === 'ConditionalExpression') return [...textsOf(node.consequent), ...textsOf(node.alternate)]
  if (node.type === 'LogicalExpression') return textsOf(node.right)
  return []
}

/**
 * Text written into JSX is English for every reader in every language. It goes
 * into a catalog and comes back through `t`, so that a second language is a
 * second catalog and no component changes, and so that the key checks see it.
 *
 * Reported: JSX text, a literal child in braces, and a literal in an attribute
 * that a person reads, each when it holds a letter. A literal in a branch of a
 * conditional child counts, because `{open ? 'Hide' : 'Show'}` is the same
 * English written one step further in.
 *
 * Not reported: a string that reaches the screen through a prop of a component,
 * such as `description="Nothing runs."` on a component of one's own. The prop has
 * a name this rule cannot know is read. Its type takes the result of `t`, and
 * review sees a literal there. Tests are outside the rule in oxlint.config.ts,
 * because a test renders a fixture and asserts on its English.
 */
export const noRawText: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Read the text of a screen from a catalog, not from the JSX',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-raw-text.md',
    },
    schema: [
      {
        type: 'object',
        // The replacement this repository offers, which a shared rule cannot name.
        properties: { hint: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      text: '"{{text}}" is written into the JSX, so every reader sees it in this language. Put it in a catalog and render it through `t`.{{hint}}',
      attribute: '`{{name}}="{{text}}"` is read by a person, and it is written in one language. Put it in a catalog and pass it through `t`.{{hint}}',
    },
  },
  create(context) {
    const hint = stringOption(optionObject(context.options), 'hint', DEFAULTS.hint)
    const hintText = hint ? ` ${hint}` : ''

    function reportTexts(node: ESTree.Node, texts: string[], messageId: 'text' | 'attribute', data: Record<string, string> = {}): void {
      const text = texts.find((candidate) => LETTER.test(candidate))
      if (text !== undefined) context.report({ node, messageId, data: { ...data, text: text.trim(), hint: hintText } })
    }

    return {
      JSXText(node) {
        reportTexts(node, [node.value], 'text')
      },
      JSXExpressionContainer(node) {
        // A child only. The value of an attribute is read through the attribute below.
        if (node.parent.type !== 'JSXElement' && node.parent.type !== 'JSXFragment') return
        reportTexts(node, textsOf(node.expression), 'text')
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || !READ_ATTRIBUTES.has(node.name.name) || node.value === null) return
        const value = node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value
        reportTexts(node, textsOf(value), 'attribute', { name: node.name.name })
      },
    }
  },
}
