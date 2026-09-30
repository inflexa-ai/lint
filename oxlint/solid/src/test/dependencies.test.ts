import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const readme = readFileSync(fileURLToPath(import.meta.resolve('../../README.md')), 'utf8')
const installStart = readme.indexOf('## Install')
const install = readme.slice(installStart, readme.indexOf('\n## ', installStart))

test('the Install section of the README instructs the side-by-side TypeScript install', () => {
  expect(install).toContain('"@typescript/native": "npm:typescript@7.0.2"')
  expect(install).toContain('"typescript": "npm:@typescript/typescript6@^6.0.2"')
  expect(install).toContain('`@typescript-eslint/utils` 8.71.0')
  expect(install).toContain('`>=4.8.4 <6.1.0`')
  expect(install).toContain('typescript-eslint/typescript-eslint#10940')
  expect(install).toContain('`npm ls --all` exits 0')
  expect(install).toContain('TypeScript 6')
  expect(install).toContain('TypeScript 7')
})

test('no instruction of the README installs `typescript` 7 or names it an optional peer', () => {
  expect(readme).not.toMatch(/(?<!npm:)typescript@\d/)
  expect(readme).not.toContain('`typescript` 7.0.2')
  expect(readme).not.toMatch(/`typescript`[^.\n]*optional peer/)
})
