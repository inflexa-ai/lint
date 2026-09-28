#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { TypecheckLoadError } from './errors.ts'
import { runTypecheck } from './run.ts'

function fail(message: string): void {
  process.stderr.write(`inflexa-typecheck: ${message}\n`)
  process.exitCode = 1
}

let values: { project?: string[]; config?: string } | undefined
try {
  ;({ values } = parseArgs({ options: { project: { type: 'string', short: 'p', multiple: true }, config: { type: 'string' } } }))
} catch (error) {
  // `parseArgs` refuses an unknown option or a missing value with a `TypeError`.
  if (!(error instanceof TypeError)) throw error
  fail(error.message)
}

if (values !== undefined) {
  try {
    const { output, exitCode } = await runTypecheck({ cwd: process.cwd(), projects: values.project ?? [], config: values.config })
    process.stdout.write(output)
    process.exitCode = exitCode
  } catch (error) {
    if (!(error instanceof TypecheckLoadError)) throw error
    fail(error.message)
  }
}
