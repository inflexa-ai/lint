import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { DEFAULT_TAILWIND_RESTRICT, playwright, react, testingLibrary } from '../index.ts'

test('the testing library preset carries the rules of the flat react config', () => {
  expect(testingLibrary.jsPlugins).toEqual([fileURLToPath(import.meta.resolve('eslint-plugin-testing-library'))])
  expect(Object.keys(testingLibrary.rules ?? {})).toContain('testing-library/render-result-naming-convention')
  expect(Object.keys(testingLibrary.rules ?? {})).toContain('testing-library/prefer-screen-queries')
})

test('the playwright preset carries the rules of the flat recommended config and quiets the rule of hooks', () => {
  expect(playwright.jsPlugins).toEqual([fileURLToPath(import.meta.resolve('eslint-plugin-playwright'))])
  expect(Object.keys(playwright.rules ?? {})).toContain('playwright/no-wait-for-timeout')
  expect(playwright.rules).toMatchObject({ 'react/rules-of-hooks': 'off' })
})

test('the react doctor option carries the plugin, the compiler capability and the rules', () => {
  const config = react({ reactDoctor: true })

  expect(config.jsPlugins).toContain(fileURLToPath(import.meta.resolve('eslint-plugin-react-doctor')))
  expect(config.settings).toEqual({ 'react-doctor': { capabilities: ['react-compiler'] } })

  const block = config.overrides?.find((override) => override.files.includes('**/*.{ts,tsx}') && override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.rules).toMatchObject({ 'react-doctor/query-stable-query-client': 'warn' })
})

test('the react doctor option leaves off the rules that the native react block already runs', () => {
  const config = react({ reactDoctor: true })

  const block = config.overrides?.find((override) => override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.rules).toMatchObject({
    'react-doctor/rules-of-hooks': 'off',
    'react-doctor/exhaustive-deps': 'off',
    'react-doctor/only-export-components': 'off',
  })
})

test('the react doctor option takes the globs of the repository', () => {
  const config = react({ reactDoctor: { files: ['apps/*/src/**', 'packages/*/src/**'] } })

  const block = config.overrides?.find((override) => override.files.includes('apps/*/src/**') && override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.files).toEqual(['apps/*/src/**', 'packages/*/src/**'])
})

test('without the react doctor option the configuration names nothing of it', () => {
  expect(JSON.stringify(react())).not.toContain('react-doctor')
})

test('the tailwind restrict option replaces the default restricted classes', () => {
  const restrict = [{ pattern: '^(.*:)?fixed$', message: 'Keep it in the flow.' }]
  const config = react({ tailwind: { entryPoint: './src/app.css', restrict } })

  expect(config.overrides).toContainEqual({
    files: ['**/*.{ts,tsx}'],
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error',
      'better-tailwindcss/no-restricted-classes': ['error', { restrict }],
    },
  })
})

test('the tailwind restrict false switches the rule off and the default names the restricted classes', () => {
  const config = react({ tailwind: { entryPoint: './src/app.css', restrict: false } })

  expect(config.overrides).toContainEqual({ files: ['**/*.{ts,tsx}'], rules: { 'better-tailwindcss/enforce-canonical-classes': 'error' } })
  expect(DEFAULT_TAILWIND_RESTRICT.map(({ pattern }) => pattern)).toEqual(['color-mix', '^(.*:)?absolute$', '^(.*:)?-?z-(\\d+|auto|\\[.*\\]|\\(.*\\))$'])
})
