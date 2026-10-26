import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, test } from 'vitest'
import { typescript } from '../index.ts'

const oxlint = fileURLToPath(new URL('../../../node_modules/.bin/oxlint', import.meta.url))
const folder = mkdtempSync(path.join(tmpdir(), 'syntax-bans-'))

afterAll(() => {
  rmSync(folder, { recursive: true, force: true })
})

/** The lines of `code` that `eslint-js/no-restricted-syntax` reports under the configuration of `typescript()`. */
function bannedLines(code: string): number[] {
  // The bans need no types, and a run with types needs a project of TypeScript around the file.
  const config = { ...typescript(), options: { ...typescript().options, typeAware: false } }
  writeFileSync(path.join(folder, '.oxlintrc.json'), JSON.stringify(config))
  writeFileSync(path.join(folder, 'sample.ts'), code)
  // oxlint exits with status 1 when it reports, thus the output is read whatever the status is.
  const { stdout: output } = spawnSync(oxlint, ['-c', '.oxlintrc.json', '--format', 'unix', 'sample.ts'], {
    cwd: folder,
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '--conditions=source' },
  })
  return output
    .split('\n')
    .filter((line) => line.includes('no-restricted-syntax'))
    .map((line) => Number(line.split(':')[1]))
}

describe('the jsonParse ban', () => {
  test('lets a schema parse the value that JSON.parse gives', () => {
    expect(
      bannedLines(`const a = Settings.parse(JSON.parse(text))\nconst b = Settings.safeParse(JSON.parse(text))\nconst c = await Settings.parseAsync(JSON.parse(text))\n`),
    ).toEqual([])
  })

  test('reports a JSON.parse that no schema parses, and the method passed on uncalled', () => {
    expect(bannedLines(`const a = JSON.parse(text)\nconst b = z.string().transform(JSON.parse)\nconst c = Settings.parse(JSON.parse(text).data)\n`)).toEqual([1, 2, 3])
  })
})

describe('the regex ban', () => {
  test('reports a string pattern that match and search turn into a RegExp', () => {
    expect(bannedLines(`const a = s.match('^\\\\d+$')\nconst b = s.search('x+')\nconst c = s.includes('x+')\n`)).toEqual([1, 2])
  })
})
