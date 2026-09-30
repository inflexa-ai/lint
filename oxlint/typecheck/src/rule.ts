import type { Node, SourceFile, SyntaxKind } from '@typescript/native/unstable/ast'
import type { Checker, Program } from '@typescript/native/unstable/sync'

/** A value of an option, as JSON writes it. */
export type OptionValue = string | number | boolean | null | OptionValue[] | { [key: string]: OptionValue }

/** The options of a rule: one object, which the configuration merges over the defaults of the rule. */
export type RuleOptions = { [key: string]: OptionValue }

/** The data of a report, which fills the `{{name}}` placeholders of its message. */
export type ReportData = Record<string, string | number>

export type Report = { node: Node; messageId: string; data?: ReportData }

/** What a rule receives for one file of a project. */
export type RuleContext<Options extends RuleOptions = RuleOptions> = {
  /** The id of the rule in the configuration, for example `must-use-result` or `himmel/no-raw-date`. */
  id: string
  /** The options of the rule for this file, merged over `meta.defaultOptions`. */
  options: Options
  sourceFile: SourceFile
  program: Program
  checker: Checker
  /** Reports a node at its start, without its leading trivia. */
  report(report: Report): void
}

/** The functions that a rule calls for the nodes of each syntax kind, in the order of one walk of the file. */
export type Visitor = { [Kind in SyntaxKind]?: (node: Node) => void }

export type RuleMeta<Options extends RuleOptions = RuleOptions> = {
  docs: { description: string; url: string }
  messages: Record<string, string>
  defaultOptions: Options
}

/**
 * A typed rule. `create` and `checkOptions` are methods, so that a rule with
 * its own options type is a `RuleModule` of the options of any rule, as a
 * plugin holds it.
 */
export type RuleModule<Options extends RuleOptions = RuleOptions> = {
  meta: RuleMeta<Options>
  create(context: RuleContext<Options>): Visitor
  /** The problem with the merged options, or `undefined` when there is none. */
  checkOptions?(options: Options): string | undefined
}

/** Rule modules under one name. The id of each rule is `<name>/<rule name>`. */
export type Plugin = { name: string; rules: Record<string, RuleModule> }
