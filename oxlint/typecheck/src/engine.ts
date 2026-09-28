import type { Node, SourceFile } from 'typescript/unstable/ast'
import type { Checker, Program } from 'typescript/unstable/sync'
import type { ActiveRule } from './config.ts'
import type { ReportData } from './rule.ts'

/** A report of a rule, at the start of its node in a file. */
export type RuleReport = { fileName: string; pos: number; line: number; column: number; id: string; messageId: string; data: ReportData; message: string }

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g

/** A message with each `{{name}}` that the data holds replaced by its value, as ESLint fills a message. */
function fill(template: string, data: ReportData): string {
  return template.replaceAll(PLACEHOLDER, (placeholder, name: string) => (Object.hasOwn(data, name) ? String(data[name]) : placeholder))
}

/**
 * Runs the rules that are on for a file in one walk of its AST: each rule
 * gives its visitor once, and the walk calls the visitors of each node in the
 * order of the rules.
 */
export function runRules(sourceFile: SourceFile, program: Program, checker: Checker, rules: readonly ActiveRule[]): RuleReport[] {
  const reports: RuleReport[] = []
  const handlers = new Map<number, ((node: Node) => void)[]>()
  for (const { id, rule, options } of rules) {
    const visitor = rule.create({
      id,
      options,
      sourceFile,
      program,
      checker,
      report({ node, messageId, data = {} }) {
        if (!Object.hasOwn(rule.meta.messages, messageId)) throw new Error(`${id} reports the message id ${messageId}, which its meta.messages does not declare.`)
        const template = rule.meta.messages[messageId]
        const pos = node.getStart(sourceFile)
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos)
        reports.push({ fileName: sourceFile.fileName, pos, line: line + 1, column: character + 1, id, messageId, data, message: fill(template, data) })
      },
    })
    for (const [kind, handler] of Object.entries(visitor)) {
      const list = handlers.get(Number(kind))
      if (list === undefined) handlers.set(Number(kind), [handler])
      else list.push(handler)
    }
  }
  if (handlers.size === 0) return reports

  const visit = (node: Node): undefined => {
    for (const handler of handlers.get(node.kind) ?? []) handler(node)
    node.forEachChild(visit)
    return undefined
  }
  visit(sourceFile)
  return reports
}
