import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import manifest from '../../package.json' with { type: 'json' }

const readme = readFileSync(fileURLToPath(import.meta.resolve('../../README.md')), 'utf8')
const installStart = readme.indexOf('## Install')
const install = readme.slice(installStart, readme.indexOf('\n## ', installStart))

test('the manifest installs nothing for Tailwind and names the plugin as an optional peer', () => {
  expect(manifest.dependencies).not.toHaveProperty('eslint-plugin-better-tailwindcss')
  expect(manifest.peerDependencies).toHaveProperty('eslint-plugin-better-tailwindcss')
  expect(manifest.peerDependenciesMeta).toHaveProperty('eslint-plugin-better-tailwindcss', { optional: true })
})

test('the manifest installs nothing for React Doctor and names the plugin as an optional peer', () => {
  expect(manifest.dependencies).not.toHaveProperty('eslint-plugin-react-doctor')
  expect(manifest.peerDependencies).toHaveProperty('eslint-plugin-react-doctor')
  expect(manifest.peerDependenciesMeta).toHaveProperty('eslint-plugin-react-doctor', { optional: true })
})

test('the manifest names `@inflexa-ai/typecheck` as an optional peer and no `typescript` peer', () => {
  expect(manifest.peerDependencies).toHaveProperty('@inflexa-ai/typecheck')
  expect(manifest.peerDependenciesMeta).toHaveProperty('@inflexa-ai/typecheck', { optional: true })
  expect(Object.keys(manifest.peerDependencies)).not.toContain('typescript')
  expect(Object.keys(manifest.peerDependenciesMeta)).not.toContain('typescript')
})

const installNotes = [
  '"@typescript/native": "npm:typescript@7.0.2"',
  '"typescript": "npm:@typescript/typescript6@^6.0.2"',
  '`@typescript-eslint/utils` 8.71.0',
  '`>=4.8.4 <6.1.0`',
  'typescript-eslint/typescript-eslint#10940',
  '`npm ls --all` exits 0',
  'TypeScript 6',
  'TypeScript 7',
]

test.each(installNotes)('the Install section of the README states %s', (note) => {
  expect(install).toContain(note)
})

test('the Install section holds no instruction that installs `typescript` 7 or names it an optional peer', () => {
  expect(install).not.toMatch(/(?<!npm:)typescript@\d/)
  expect(install).not.toContain('`typescript` 7.0.2')
  expect(install).not.toMatch(/`typescript`[^.\n]*optional peer/)
})
