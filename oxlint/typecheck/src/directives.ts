import { type Node, type SourceFile, SyntaxKind } from 'typescript/unstable/ast'
import type { RuleReport } from './engine.ts'

export const DIRECTIVE = 'typecheck-disable-next-line'

/** The id of the problems of a directive, in the place of a rule id. */
export const DIRECTIVE_ID = 'typecheck-disable'

// The tokens whose text is not code: a directive in one of them is text of the program.
const LITERALS = new Set<SyntaxKind>([
  SyntaxKind.StringLiteral,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.TemplateHead,
  SyntaxKind.TemplateMiddle,
  SyntaxKind.TemplateTail,
  SyntaxKind.RegularExpressionLiteral,
  SyntaxKind.JsxText,
])

type Range = { start: number; end: number }

/** The ranges of the literal tokens of a file, in the order of the text. */
function literalRanges(sourceFile: SourceFile): Range[] {
  const ranges: Range[] = []
  const visit = (node: Node): undefined => {
    if (LITERALS.has(node.kind)) ranges.push({ start: node.getStart(sourceFile), end: node.end })
    node.forEachChild(visit)
    return undefined
  }
  visit(sourceFile)
  return ranges.sort((a, b) => a.start - b.start)
}

type Comment = Range & { text: string }

/**
 * The comments of a file. Each `//` and `/*` outside of a literal token starts
 * a comment, because the literals are the only tokens that can hold that text:
 * a string, a template, a regular expression, or the text of JSX.
 */
function commentsOf(sourceFile: SourceFile): Comment[] {
  const { text } = sourceFile
  const literals = literalRanges(sourceFile)
  const comments: Comment[] = []
  let index = 0
  let next = 0
  while (index < text.length) {
    while (next < literals.length && literals[next].end <= index) next += 1
    const literal = literals.at(next)
    if (literal !== undefined && literal.start <= index) {
      index = literal.end
      continue
    }
    const limit = literal?.start ?? text.length
    const slash = text.indexOf('/', index)
    if (slash === -1 || slash >= limit) {
      index = limit
      continue
    }
    const kind = text[slash + 1]
    if (kind === '/' || kind === '*') {
      const close = kind === '/' ? text.indexOf('\n', slash) : text.indexOf('*/', slash + 2)
      const end = close === -1 ? text.length : kind === '/' ? close : close + 2
      comments.push({ start: slash, end, text: text.slice(slash + 2, kind === '/' ? end : Math.max(slash + 2, end - 2)) })
      index = end
    } else {
      index = slash + 1
    }
  }
  return comments
}

type Directive = { start: number; line: number; column: number; target: number; ids: string[]; reason: string; used: Set<string> }

/** The directive of a comment, or `undefined` for a comment that does not start with the keyword. */
function directiveOf(sourceFile: SourceFile, comment: Comment): Directive | undefined {
  const body = comment.text.trim()
  if (!body.startsWith(DIRECTIVE)) return undefined
  const rest = body.slice(DIRECTIVE.length)
  if (rest !== '' && !/^\s/.test(rest)) return undefined
  const separator = /\s--(?:\s|$)/.exec(rest)
  const list = separator === null ? rest : rest.slice(0, separator.index)
  const reason = separator === null ? '' : rest.slice(separator.index + separator[0].length).trim()
  const ids = list
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id !== '')
  const start = sourceFile.getLineAndCharacterOfPosition(comment.start)
  const last = sourceFile.getLineAndCharacterOfPosition(comment.end - 1).line
  return { start: comment.start, line: start.line + 1, column: start.character + 1, target: last + 2, ids, reason, used: new Set() }
}

const MESSAGES = {
  noReason: 'The directive gives no reason. Write the reason after ` -- `.',
  noRule: `The directive names no rule. Name each rule that it disables, and the reason after \` -- \`.`,
  unused: (id: string) => `\`${id}\` reports nothing on the next line, so the directive does not suppress it. Remove \`${id}\` from the directive.`,
}

/**
 * The reports of a file after its `typecheck-disable-next-line` directives. A
 * directive suppresses each report of a rule that it names on the line after
 * the last line of its comment. A directive with no reason, with no rule, or
 * with a rule that suppressed nothing gives a problem at the start of its
 * comment, and a directive with no reason still suppresses, so one mistake
 * gives one line.
 */
export function applyDirectives(sourceFile: SourceFile, reports: readonly RuleReport[]): RuleReport[] {
  if (!sourceFile.text.includes(DIRECTIVE)) return [...reports]
  const directives = commentsOf(sourceFile).flatMap((comment) => directiveOf(sourceFile, comment) ?? [])
  if (directives.length === 0) return [...reports]

  const kept = reports.filter((report) => {
    const directive = directives.find(({ target, ids }) => target === report.line && ids.includes(report.id))
    directive?.used.add(report.id)
    return directive === undefined
  })
  const problem = (directive: Directive, message: string): RuleReport => ({
    fileName: sourceFile.fileName,
    pos: directive.start,
    line: directive.line,
    column: directive.column,
    id: DIRECTIVE_ID,
    messageId: DIRECTIVE_ID,
    data: {},
    message,
  })
  for (const directive of directives) {
    if (directive.ids.length === 0) kept.push(problem(directive, MESSAGES.noRule))
    else if (directive.reason === '') kept.push(problem(directive, MESSAGES.noReason))
    for (const id of directive.ids) if (!directive.used.has(id)) kept.push(problem(directive, MESSAGES.unused(id)))
  }
  return kept
}
