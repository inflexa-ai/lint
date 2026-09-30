import { AssertionError } from 'node:assert'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { API, type Snapshot } from '@typescript/native/unstable/sync'
import { mergeRuleOptions } from './config.ts'
import { type RuleReport, runRules } from './engine.ts'
import type { ReportData, RuleModule, RuleOptions } from './rule.ts'

/** A case: the code of one file of the fixture folder, its name, and the options of the rule. */
export type TestCase = {
  code: string
  /** The name of the file in the fixture folder, `case.ts` by default. The tsconfig of the folder must include it. */
  filename?: string
  /** The options of the rule, merged over its defaults and checked as the configuration checks them. */
  options?: RuleOptions
  /** The title of the test, the code by default. */
  name?: string
}

/** A report that an invalid case expects. `data`, `line` and `column` are compared when a case gives them. */
export type ExpectedReport = { messageId: string; data?: ReportData; line?: number; column?: number }

export type ValidCase = string | TestCase

export type InvalidCase = TestCase & { errors: ExpectedReport[] }

export type TestCases = { valid: ValidCase[]; invalid: InvalidCase[] }

/** The shape of `describe` and `it` of a test framework, as the tester calls them. */
export type TestFunction = (name: string, fn: () => void) => unknown

const DEFAULT_FILENAME = 'case.ts'

function describeReport(report: RuleReport): string {
  return `${String(report.line)}:${String(report.column)} ${report.messageId} ${JSON.stringify(report.data)}: ${report.message}`
}

/** The differences between the reports of a case and the reports that it expects, or `undefined` when they agree. */
function compareReports(reports: readonly RuleReport[], expected: readonly ExpectedReport[]): string | undefined {
  if (reports.length !== expected.length) {
    return `The rule gave ${String(reports.length)} reports and the case expects ${String(expected.length)}:\n${reports.map(describeReport).join('\n')}`
  }
  const problems = expected.flatMap((want, index) => {
    const report = reports[index]
    const differences = [
      report.messageId === want.messageId ? undefined : `message id ${report.messageId}, expected ${want.messageId}`,
      want.data === undefined || isDeepStrictEqual(report.data, want.data) ? undefined : `data ${JSON.stringify(report.data)}, expected ${JSON.stringify(want.data)}`,
      want.line === undefined || report.line === want.line ? undefined : `line ${String(report.line)}, expected ${String(want.line)}`,
      want.column === undefined || report.column === want.column ? undefined : `column ${String(report.column)}, expected ${String(want.column)}`,
    ].filter((difference) => difference !== undefined)
    return differences.length === 0 ? [] : [`Report ${String(index + 1)} (${describeReport(report)}): ${differences.join(', ')}`]
  })
  return problems.length === 0 ? undefined : problems.join('\n')
}

/**
 * Runs the valid and the invalid cases of a typed rule against a fixture
 * folder. The code of each case is a file of that folder, served through the
 * file system callbacks of the API, so the tsconfig of the folder must include
 * the file names of the cases. One API serves each `run`, and each case takes
 * a new snapshot after the cache of source files is cleared, because the API
 * otherwise gives the old AST of a changed file.
 *
 * `RuleTester.describe` and `RuleTester.it` take the functions of the test
 * framework, as the RuleTester of oxlint does. `RuleTester.afterAll`, when
 * given, closes the API when a case of the run did not run.
 */
export class RuleTester {
  static describe: TestFunction | undefined
  static it: TestFunction | undefined
  static afterAll: ((fn: () => void) => unknown) | undefined

  readonly #fixtures: string

  constructor({ fixtures }: { fixtures: string }) {
    this.#fixtures = fixtures
  }

  run<Options extends RuleOptions>(name: string, rule: RuleModule<Options>, { valid, invalid }: TestCases): void {
    const { describe, it, afterAll } = RuleTester
    if (describe === undefined || it === undefined) throw new Error('Set RuleTester.describe and RuleTester.it to the functions of the test framework.')
    const fixtures = this.#fixtures
    const tsconfig = path.join(fixtures, 'tsconfig.json')
    const total = valid.length + invalid.length
    let finished = 0
    let api: API | undefined
    let snapshot: Snapshot | undefined
    let current = { file: '', code: '' }

    const close = (): void => {
      api?.close()
      api = undefined
    }

    const reportsOf = (testCase: TestCase): RuleReport[] => {
      const file = path.join(fixtures, testCase.filename ?? DEFAULT_FILENAME)
      const previous = current.file
      current = { file, code: testCase.code }
      if (api === undefined) {
        api = new API({
          cwd: fixtures,
          fs: {
            readFile: (fileName) => (fileName === current.file ? current.code : undefined),
            fileExists: (fileName) => (fileName === current.file ? true : undefined),
            getAccessibleEntries: (directory) => {
              if (directory !== path.dirname(current.file)) return undefined
              const entries = readdirSync(directory, { withFileTypes: true })
              return {
                files: [...entries.filter((entry) => entry.isFile()).map((entry) => entry.name), path.basename(current.file)],
                directories: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
              }
            },
          },
        })
        snapshot = api.updateSnapshot({ openProjects: [tsconfig] })
      } else {
        snapshot?.dispose()
        api.clearSourceFileCache()
        snapshot = api.updateSnapshot({ fileChanges: previous === file ? { changed: [file] } : { deleted: [previous], created: [file] } })
      }
      const project = snapshot.getProject(tsconfig)
      if (project === undefined) throw new Error(`The API opened no project for ${tsconfig}.`)
      const sourceFile = project.program.getSourceFile(file)
      if (sourceFile === undefined) throw new Error(`The project of ${tsconfig} does not include ${file}. Include the file names of the cases in its tsconfig.`)
      const options = mergeRuleOptions(name, rule, testCase.options ?? {})
      return runRules(sourceFile, project.program, project.checker, [{ id: name, rule, options }])
    }

    const test = (title: string, body: () => void): void => {
      it(title, () => {
        try {
          body()
        } finally {
          finished += 1
          if (finished === total) close()
        }
      })
    }

    describe(name, () => {
      afterAll?.(close)
      describe('valid', () => {
        for (const entry of valid) {
          const testCase = typeof entry === 'string' ? { code: entry } : entry
          test(testCase.name ?? testCase.code, () => {
            const reports = reportsOf(testCase)
            if (reports.length > 0) throw new AssertionError({ message: `A valid case gave ${String(reports.length)} reports:\n${reports.map(describeReport).join('\n')}` })
          })
        }
      })
      describe('invalid', () => {
        for (const testCase of invalid) {
          test(testCase.name ?? testCase.code, () => {
            const problem = compareReports(reportsOf(testCase), testCase.errors)
            if (problem !== undefined) throw new AssertionError({ message: problem })
          })
        }
      })
    })
  }
}

/** A tester for the rules whose cases are files of the fixture folder `fixtures`. */
export function createRuleTester({ fixtures }: { fixtures: string }): RuleTester {
  return new RuleTester({ fixtures })
}
