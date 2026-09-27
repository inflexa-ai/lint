#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { checkArchitectureDirectives } from './architecture-directives.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { ignore: { type: 'string', multiple: true } },
})

const violations = await checkArchitectureDirectives(positionals.length > 0 ? positionals : ['.'], { ignores: values.ignore })
for (const { file, line, column, message } of violations) console.error(`${file}:${line}:${column}: ${message}`)
process.exitCode = violations.length > 0 ? 1 : 0
