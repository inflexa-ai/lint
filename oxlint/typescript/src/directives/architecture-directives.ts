import { opendir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

/** A directive that disables an architecture rule, where it stands in the file. */
export type Violation = { line: number; column: number; message: string }

/** A violation, and the file that holds it. */
export type FileViolation = Violation & { file: string }

/**
 * The rules that no file can switch off in silence. The prefix also matches
 * `@inflexa-ai/react/`, thus one guard covers the rules of both plugins.
 */
export const ARCHITECTURE_RULES = {
  prefixes: ['@inflexa-ai/'],
  // Where one test file has to sit is a fact about that test, and there is
  // nothing for the lint configuration to decide about it.
  inlineAllowed: ['@inflexa-ai/test-placement'],
}

// oxlint reads the `oxlint-` form and ESLint reads the `eslint-` form, and each
// can switch off a rule of this repository.
const LINE_DIRECTIVE = /\/\/[ \t]*((?:es|ox)lint-disable)(?:-next-line|-line)?(?![\w-])([^\n]*)/g
// A block directive's rule list may wrap across lines.
const BLOCK_DIRECTIVE = /\/\*\s*((?:es|ox)lint-disable)(?:-next-line|-line)?(?![\w-])([\s\S]*?)\*\//g

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.git'])
// Enough reads in flight to keep the disk busy, few enough to stay far below
// the limit of open files.
const READ_CONCURRENCY = 32

function positionAt(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index)
  const line = before.split('\n').length
  return { line, column: index - before.lastIndexOf('\n') }
}

/**
 * Finds inline disable directives that switch off an architecture rule, either
 * by naming one or by naming nothing and so disabling everything.
 *
 * Silencing a rule is the cheapest way to make a lint error go away, and it
 * leaves the violation where no reviewer is looking. An exception to an
 * architecture rule is a decision about the architecture, so it belongs in the
 * lint configuration, where it reads as one.
 *
 * `inlineAllowed` is for the rule whose exceptions are not that. Where a test
 * file may live is a fact about that one test, not a position on how the
 * repository is built. Such a rule is argued where the fact is, in the file
 * itself, and only together with the reason, so the exception still reaches
 * the reviewer as an exception rather than as silence.
 *
 * This runs outside of the linters because a rule's report is itself subject to
 * disable directives: `/* oxlint-disable *\/` would suppress the report about
 * `/* oxlint-disable *\/`. It reads the source text, not the AST. The cost is
 * that directive text inside a string literal is matched as well; only code
 * that writes about lint directives can hit that.
 */
export function findArchitectureDirectiveViolations(text: string, prefixes: string[], inlineAllowed: string[] = []): Violation[] {
  const violations: Violation[] = []

  for (const pattern of [LINE_DIRECTIVE, BLOCK_DIRECTIVE]) {
    for (const match of text.matchAll(pattern)) {
      const [, keyword, directive] = match
      // Anything after ` -- ` is the justification, not part of the rule list.
      const [ruleList, ...rest] = directive.split(/\s--(?:\s|$)/)
      const justification = rest.join(' -- ').trim()
      const rules = ruleList
        .split(',')
        .map((rule) => rule.trim())
        .filter(Boolean)
      const position = positionAt(text, match.index)

      if (rules.length === 0) {
        violations.push({
          ...position,
          message: `A blanket ${keyword} also switches off the architecture rules. Name the specific rule and give the reason after \` -- \`.`,
        })
        continue
      }

      for (const rule of rules) {
        if (!prefixes.some((prefix) => rule.startsWith(prefix))) continue

        if (inlineAllowed.includes(rule)) {
          if (justification) continue
          violations.push({
            ...position,
            message: `\`${rule}\` may be disabled here, but not silently: write \`${keyword} ${rule} -- <reason>\` so the next reader learns what makes this file the exception.`,
          })
          continue
        }

        violations.push({
          ...position,
          message: `\`${rule}\` is an architecture rule and cannot be disabled inline. Fix the code the way the rule's own message describes. If the rule is wrong for this case, change its zone or options in the lint configuration so the exception is visible in review.`,
        })
      }
    }
  }

  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

/** Each source file at or below `start`, outside of the folders that hold no source. */
async function* sourceFiles(start: string): AsyncGenerator<string> {
  if (!(await stat(start)).isDirectory()) {
    if (SOURCE_EXTENSIONS.has(path.extname(start))) yield start
    return
  }
  for await (const entry of await opendir(start)) {
    const entryPath = path.join(start, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) yield* sourceFiles(entryPath)
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      yield entryPath
    }
  }
}

export type CheckOptions = {
  /** Globs, relative to `cwd`, of the files that the check leaves out. */
  ignores?: string[]
  cwd?: string
  prefixes?: string[]
  inlineAllowed?: string[]
}

/**
 * Checks each source file at or below `paths`. A path names a file or a
 * folder, relative to `cwd`.
 */
export async function checkArchitectureDirectives(paths: string[], options: CheckOptions = {}): Promise<FileViolation[]> {
  const { ignores = [], cwd = process.cwd(), prefixes = ARCHITECTURE_RULES.prefixes, inlineAllowed = ARCHITECTURE_RULES.inlineAllowed } = options
  const violations: FileViolation[] = []

  async function* files(): AsyncGenerator<string> {
    for (const start of paths) {
      for await (const file of sourceFiles(path.resolve(cwd, start))) {
        const relative = path.relative(cwd, file)
        if (!ignores.some((glob) => path.matchesGlob(relative, glob))) yield relative
      }
    }
  }

  // The workers share one iterator, thus the walk and the reads stay bounded.
  const queue = files()
  async function worker(): Promise<void> {
    for await (const file of queue) {
      const text = await readFile(path.resolve(cwd, file), 'utf8')
      for (const violation of findArchitectureDirectiveViolations(text, prefixes, inlineAllowed)) violations.push({ file, ...violation })
    }
  }
  await Promise.all(Array.from({ length: READ_CONCURRENCY }, worker))

  return violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column)
}
