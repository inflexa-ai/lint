import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { DEFAULT_TAILWIND_RESTRICT, react } from '../index.ts'

test('the tailwind option registers the better-tailwindcss plugin with its rules and the entry point', () => {
  const config = react({ tailwind: { entryPoint: './src/app.css' } })

  expect(config.jsPlugins).toContain(fileURLToPath(import.meta.resolve('eslint-plugin-better-tailwindcss')))
  expect(config.settings).toEqual({ 'better-tailwindcss': { entryPoint: './src/app.css' } })
  expect(config.overrides).toContainEqual({
    files: ['**/*.{ts,tsx}'],
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error',
      'better-tailwindcss/no-restricted-classes': ['error', { restrict: DEFAULT_TAILWIND_RESTRICT }],
    },
  })
})

test('without the tailwind option the configuration names nothing of Tailwind', () => {
  expect(JSON.stringify(react())).not.toContain('tailwind')
})
