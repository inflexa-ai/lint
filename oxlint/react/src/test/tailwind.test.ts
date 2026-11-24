import { fileURLToPath } from 'node:url'
import betterTailwind from 'eslint-plugin-better-tailwindcss'
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults'
import { SelectorKind } from 'eslint-plugin-better-tailwindcss/types'
import type { RuleTester } from 'oxlint/plugins-dev'
import { expect, test } from 'vitest'
import { react } from '../index.ts'
import { CLASS_CALLEES } from '../rules/class-constant-name.ts'
import { createRuleTester } from '../rules/test/rule-tester.ts'

const classesSelector = { kind: 'variable', name: '^.*_CLASSES$', match: [{ type: 'strings' }, { type: 'objectValues' }] }

const tailwindSettings = (entryPoint: string) => ({ 'better-tailwindcss': { entryPoint, selectors: [...getDefaultSelectors(), classesSelector] } })

test('the tailwind option registers the better-tailwindcss plugin with its rules, the entry point and the selectors', () => {
  const config = react({ tailwind: { entryPoint: './src/app.css' } })

  expect(config.jsPlugins).toContain(fileURLToPath(import.meta.resolve('eslint-plugin-better-tailwindcss')))
  expect(config.settings).toEqual(tailwindSettings('./src/app.css'))
  expect(config.overrides).toContainEqual({
    files: ['**/*.{ts,tsx}'],
    rules: { 'better-tailwindcss/enforce-canonical-classes': 'error', '@inflexa-ai/react/class-constant-name': 'error' },
  })
})

test('without the tailwind option the configuration names nothing of Tailwind', () => {
  expect(JSON.stringify(react())).not.toContain('tailwind')
})

test('class-constant-name knows each named default callee of the plugin', () => {
  const callees = getDefaultSelectors().flatMap((selector) => (selector.kind === SelectorKind.Callee && 'name' in selector ? [selector.name] : []))
  expect(new Set(callees)).toEqual(new Set([...CLASS_CALLEES].map((name) => `^${name}$`)))
})

// The rules resolve the entry point from the working directory of the run, which is the package.
// SAFETY: the selectors are JSON data. Their type marks an absent `match` as an
// optional `never`, and the JSON type of the rule tester does not admit `undefined`.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the SAFETY comment above gives the invariant
const settings = tailwindSettings('src/test/fixtures/tailwind.css') as NonNullable<RuleTester.ValidTestCase['settings']>
const restrict = [{ pattern: '^w-\\[', message: 'Use a width of the scale.' }]

const linted = [
  `export const RAIL_CLASSES = 'max-w-[40rem] w-[13px]'`,
  `export const LOOKS_CLASSES = { sidebar: { course: 'max-w-[40rem] w-[13px]' } } as const`,
  `export const classes = 'max-w-[40rem] w-[13px]'`,
]

createRuleTester().run('better-tailwindcss/enforce-canonical-classes', betterTailwind.rules['enforce-canonical-classes'], {
  valid: [{ code: `export const RAIL_BUTTON = 'max-w-[40rem]'`, settings }],
  invalid: linted.map((code) => ({ code, settings, errors: 1, output: code.replace('max-w-[40rem]', 'max-w-160') })),
})

createRuleTester().run('better-tailwindcss/no-restricted-classes', betterTailwind.rules['no-restricted-classes'], {
  valid: [{ code: `export const RAIL_BUTTON = 'w-[13px]'`, settings, options: [{ restrict }] }],
  invalid: linted.map((code) => ({ code, settings, options: [{ restrict }], errors: [{ message: 'Use a width of the scale.' }] })),
})
