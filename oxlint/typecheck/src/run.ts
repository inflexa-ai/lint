import { readFileSync } from 'node:fs'
import path from 'node:path'
import { API } from '@typescript/native/unstable/sync'
import { loadConfig, resolveRules } from './config.ts'
import { applyDirectives, DIRECTIVE } from './directives.ts'
import { computeLineStarts } from '@typescript/native/unstable/ast'
import { collectDiagnostics, displayPath, formatDiagnostic, sortAndDeduplicate, withRealConfig } from './diagnostics.ts'
import { type RuleReport, runRules } from './engine.ts'
import { TypecheckLoadError } from './errors.ts'
import { projectFiles, resolveProject, withoutByteOrderMark } from './projects.ts'
import { rules as builtinRules } from './rules/index.ts'

export type TypecheckRun = {
  /** The working folder: the base of `projects`, of the globs, and of each printed path. */
  cwd: string
  /** The tsconfig files or folders of `-p`, in order. None checks `tsconfig.json` of `cwd`. */
  projects: string[]
  /** The configuration file of `--config`, relative to `cwd`. */
  config?: string
}

export type TypecheckResult = { output: string; exitCode: 0 | 1 }

const DECLARATION_FILE = /\.d\.[cm]?ts$/

/** Whether the rules visit a file: a source file of the repository, not a declaration file and not a dependency. */
function isRuleTarget(relative: string): boolean {
  return !DECLARATION_FILE.test(relative) && !relative.startsWith('../') && !path.isAbsolute(relative) && !relative.split('/').includes('node_modules')
}

type PrintedReport = RuleReport & { path: string }

function compareReports(a: PrintedReport, b: PrintedReport): number {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1
  return a.line - b.line || a.column - b.column
}

/**
 * One run of the command. It prints the diagnostics of `tsc --noEmit` for each
 * project, in the order of the projects, and then the reports of the rules of
 * all projects, sorted by path, line and column. All projects open in one
 * snapshot of one API, thus one TypeScript process serves the run. A rule runs
 * once on each file, in the first project of the order that holds the file.
 */
export async function runTypecheck({ cwd, projects, config: configFile }: TypecheckRun): Promise<TypecheckResult> {
  const files = (projects.length > 0 ? projects : ['.']).map((project) => projectFiles(resolveProject(cwd, project)))
  const resolved = resolveRules(await loadConfig(cwd, configFile), builtinRules)
  const virtualTexts = new Map(files.map(({ virtual, virtualText }) => [virtual, virtualText]))
  const lines = new Map<string, readonly number[]>()
  function linesOf(fileName: string): readonly number[] {
    let starts = lines.get(fileName)
    if (starts === undefined) {
      // The line map of TypeScript, over the text without the byte order mark that its positions do not count.
      starts = computeLineStarts(withoutByteOrderMark(virtualTexts.get(fileName) ?? readFileSync(fileName, 'utf8')))
      lines.set(fileName, starts)
    }
    return starts
  }

  const api = new API({
    cwd,
    fs: {
      readFile: (fileName) => virtualTexts.get(fileName),
      fileExists: (fileName) => (virtualTexts.has(fileName) ? true : undefined),
    },
  })
  try {
    const snapshot = api.updateSnapshot({ openProjects: files.map(({ virtual }) => virtual) })
    let output = ''
    const reports: PrintedReport[] = []
    const visited = new Set<string>()
    for (const projectFile of files) {
      const { tsconfig, virtual } = projectFile
      const project = snapshot.getProject(virtual)
      if (project === undefined) throw new TypecheckLoadError(`Cannot open the project ${path.relative(cwd, tsconfig)}.`)
      const diagnostics = sortAndDeduplicate(collectDiagnostics(project.program).map((diagnostic) => withRealConfig(diagnostic, projectFile)))
      for (const diagnostic of diagnostics) output += formatDiagnostic(diagnostic, cwd, linesOf)

      for (const fileName of project.program.getSourceFileNames()) {
        if (visited.has(fileName)) continue
        visited.add(fileName)
        const relative = displayPath(cwd, fileName)
        if (!isRuleTarget(relative)) continue
        const active = resolved.rulesFor(relative)
        // The directives of a file where no rule is on can only be problems, thus a file with neither needs no AST.
        if (active.length === 0 && !readFileSync(fileName, 'utf8').includes(DIRECTIVE)) continue
        const sourceFile = project.program.getSourceFile(fileName)
        if (sourceFile === undefined || sourceFile.isDeclarationFile) continue
        const found = active.length === 0 ? [] : runRules(sourceFile, project.program, project.checker, active)
        for (const report of applyDirectives(sourceFile, found)) reports.push({ ...report, path: relative })
      }
    }
    for (const { path: file, line, column, id, message } of reports.toSorted(compareReports)) output += `${file}(${String(line)},${String(column)}): error ${id}: ${message}\n`
    return { output, exitCode: output === '' ? 0 : 1 }
  } finally {
    api.close()
  }
}
