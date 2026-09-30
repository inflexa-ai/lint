import path from 'node:path'
import { type Diagnostic, DiagnosticCategory, type Program } from '@typescript/native/unstable/sync'
import type { ProjectFiles } from './projects.ts'

/**
 * The diagnostics of a program in the order and with the gates of `tsc`: the
 * `GetDiagnosticsOfAnyProgram` and `EmitFilesAndReportErrors` path of
 * typescript-go at `typescript/v7.0.2`. A syntax error hides the options, the
 * global and the semantic diagnostics, and an option or a global error hides
 * the semantic ones, as in `tsc`.
 *
 * The declaration diagnostics join in two ways, as in `tsc` under `noEmit`,
 * which the virtual tsconfig of the command always sets. The gated path adds
 * them when nothing else was found. Outside of an incremental or composite
 * project, the emit of `tsc` also runs the declaration transform on each file
 * and adds its diagnostics beside the others, unless `noEmitOnError` stopped
 * the emit on an earlier error.
 */
export function collectDiagnostics(program: Program): Diagnostic[] {
  const options = program.getCompilerOptions()
  const emitsDeclarations = options.declaration === true || options.composite === true
  let declarations: readonly Diagnostic[] | undefined
  const declarationDiagnostics = (): readonly Diagnostic[] => (declarations ??= program.getDeclarationDiagnostics())

  const all = [...program.getConfigFileParsingDiagnostics()]
  const configCount = all.length
  all.push(...program.getSyntacticDiagnostics())
  if (all.length === configCount) {
    all.push(...program.getProgramDiagnostics())
    all.push(...program.getGlobalDiagnostics())
    if (all.length === configCount) {
      all.push(...program.getSemanticDiagnostics())
      all.push(...program.getGlobalDiagnostics())
    }
    if (emitsDeclarations && all.length === configCount) all.push(...declarationDiagnostics())
  }
  const incremental = options.incremental === true || options.composite === true
  if (emitsDeclarations && !incremental && !(options.noEmitOnError === true && all.length > 0)) all.push(...declarationDiagnostics())
  return sortAndDeduplicate(all)
}

/**
 * A diagnostic of the program of a virtual tsconfig as `tsc` gives it for the
 * real one. Each mention of the virtual file names the real file. A location
 * in the virtual file moves to the real file: an offset after the inserted
 * text moves back by its length, and a diagnostic on the inserted text has no
 * location, as a diagnostic of an option of the command line of `tsc` has none.
 */
export function withRealConfig(diagnostic: Diagnostic, { virtual, tsconfig, insertion }: ProjectFiles): Diagnostic {
  const real = (offset: number): number => (insertion !== undefined && offset >= insertion.at + insertion.length ? offset - insertion.length : offset)
  const onInsertion = (offset: number): boolean => insertion !== undefined && offset >= insertion.at && offset < insertion.at + insertion.length
  const rename = (message: Diagnostic): Diagnostic => {
    const inVirtual = message.fileName === virtual
    return {
      ...message,
      fileName: inVirtual ? (onInsertion(message.pos) ? undefined : tsconfig) : message.fileName,
      pos: inVirtual ? real(message.pos) : message.pos,
      end: inVirtual ? Math.max(real(message.pos), real(message.end)) : message.end,
      text: message.text.replaceAll(virtual, tsconfig),
      messageChain: message.messageChain?.map(rename),
      relatedInformation: message.relatedInformation?.map(rename),
    }
  }
  return rename(diagnostic)
}

/**
 * `SortAndDeduplicateDiagnostics` of typescript-go. The API gives the text of
 * a message and not its arguments, thus the text stands for the arguments:
 * two diagnostics with one code and one location differ in their arguments
 * exactly when their texts differ.
 */
export function sortAndDeduplicate(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  const sorted = diagnostics.toSorted(compareDiagnostics)
  return sorted.filter((diagnostic, index) => index === 0 || !equalWithoutRelated(sorted[index - 1], diagnostic))
}

function compareStrings(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  return (
    compareStrings(a.fileName ?? '', b.fileName ?? '') ||
    a.pos - b.pos ||
    a.end - b.end ||
    a.code - b.code ||
    compareStrings(a.text, b.text) ||
    compareChainSize(a.messageChain ?? [], b.messageChain ?? []) ||
    compareChainContent(a.messageChain ?? [], b.messageChain ?? []) ||
    compareRelated(a.relatedInformation ?? [], b.relatedInformation ?? [])
  )
}

function compareChainSize(a: readonly Diagnostic[], b: readonly Diagnostic[]): number {
  if (a.length !== b.length) return b.length - a.length
  for (const [index, chain] of a.entries()) {
    const size = compareChainSize(chain.messageChain ?? [], b[index].messageChain ?? [])
    if (size !== 0) return size
  }
  return 0
}

function compareChainContent(a: readonly Diagnostic[], b: readonly Diagnostic[]): number {
  for (const [index, chain] of a.entries()) {
    const content = compareStrings(chain.text, b[index].text) || compareChainContent(chain.messageChain ?? [], b[index].messageChain ?? [])
    if (content !== 0) return content
  }
  return 0
}

function compareRelated(a: readonly Diagnostic[], b: readonly Diagnostic[]): number {
  if (a.length !== b.length) return b.length - a.length
  for (const [index, related] of a.entries()) {
    const order = compareDiagnostics(related, b[index])
    if (order !== 0) return order
  }
  return 0
}

function equalChains(a: readonly Diagnostic[], b: readonly Diagnostic[]): boolean {
  return (
    a.length === b.length &&
    a.every((chain, index) => chain.code === b[index].code && chain.text === b[index].text && equalChains(chain.messageChain ?? [], b[index].messageChain ?? []))
  )
}

function equalWithoutRelated(a: Diagnostic, b: Diagnostic): boolean {
  return (
    (a.fileName ?? '') === (b.fileName ?? '') &&
    a.pos === b.pos &&
    a.end === b.end &&
    a.code === b.code &&
    a.text === b.text &&
    equalChains(a.messageChain ?? [], b.messageChain ?? [])
  )
}

function categoryName(category: DiagnosticCategory): string {
  switch (category) {
    case DiagnosticCategory.Error:
      return 'error'
    case DiagnosticCategory.Warning:
      return 'warning'
    case DiagnosticCategory.Suggestion:
      return 'suggestion'
    case DiagnosticCategory.Message:
      return 'message'
    default: {
      const unknown: never = category
      throw new Error(`Unknown diagnostic category ${String(unknown)}`)
    }
  }
}

function flattenChain(chain: readonly Diagnostic[], level: number): string {
  return chain.map((message) => `\n${'  '.repeat(level)}${message.text}${flattenChain(message.messageChain ?? [], level + 1)}`).join('')
}

/** A line and a column, both from 1, of a position that counts UTF-16 units. */
export type Location = { line: number; column: number }

/** The location of a position, from the line starts of its text. */
export function locationOf(starts: readonly number[], position: number): Location {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (starts[middle] <= position) low = middle
    else high = middle - 1
  }
  return { line: low + 1, column: position - starts[low] + 1 }
}

/** The path of a file relative to the working folder, with `/` between the parts, as `tsc` prints it. */
export function displayPath(cwd: string, fileName: string): string {
  return path.relative(cwd, fileName).split(path.sep).join('/')
}

/**
 * A diagnostic as `tsc --pretty false` writes it (`WriteFormatDiagnostic`):
 * the location, the category and the code, the text, and each chained message
 * two spaces deeper than the one before. The related locations are left out,
 * as in `tsc`.
 */
export function formatDiagnostic(diagnostic: Diagnostic, cwd: string, linesOf: (fileName: string) => readonly number[]): string {
  let location = ''
  if (diagnostic.fileName !== undefined) {
    const { line, column } = locationOf(linesOf(diagnostic.fileName), diagnostic.pos)
    location = `${displayPath(cwd, diagnostic.fileName)}(${String(line)},${String(column)}): `
  }
  return `${location}${categoryName(diagnostic.category)} TS${String(diagnostic.code)}: ${diagnostic.text}${flattenChain(diagnostic.messageChain ?? [], 1)}\n`
}
