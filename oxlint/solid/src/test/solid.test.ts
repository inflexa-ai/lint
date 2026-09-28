import { fileURLToPath } from 'node:url'
import { typescript } from '@inflexa-ai/oxlint-plugin'
import solidTypescript from 'eslint-plugin-solid/configs/typescript'
import { expect, test } from 'vitest'
import { solid, type SolidOptions } from '../index.ts'

const options = {
  tests: ['**/*.spec.ts'],
  syntax: { timers: false },
  overrides: [{ files: ['src/**'], rules: { '@inflexa-ai/solid/require-cleanup': 'error' } }],
} satisfies SolidOptions

test('the plugins of typescript() come first, then the plugin of the package and eslint-plugin-solid', () => {
  expect(solid().jsPlugins).toEqual([
    ...(typescript().jsPlugins ?? []),
    fileURLToPath(import.meta.resolve('@inflexa-ai/oxlint-plugin-solid/plugin')),
    fileURLToPath(import.meta.resolve('eslint-plugin-solid')),
  ])
})

test('the configuration of typescript() for the same options stays whole, with the blocks of the repository last', () => {
  const base = typescript({ ...options, overrides: [] })

  expect(solid(options)).toEqual({
    ...base,
    jsPlugins: [...(base.jsPlugins ?? []), expect.any(String), expect.any(String)],
    overrides: [...(base.overrides ?? []), expect.objectContaining({ files: ['**/*.{ts,tsx}'] }), ...options.overrides],
  })
})

test('a block for each TypeScript file turns on the rules of configs/typescript and prefer-show', () => {
  const block = solid().overrides?.find((override) => override.rules && 'solid/prefer-show' in override.rules)

  expect(block?.files).toEqual(['**/*.{ts,tsx}'])
  expect(block?.rules).toEqual({ ...solidTypescript.rules, 'solid/prefer-show': 'error' })
})

test('the rules of the package and the rules of react stay off', () => {
  const config = solid()
  const names = (config.overrides ?? []).flatMap((override) => Object.keys(override.rules ?? {}))

  expect(names.filter((name) => name.startsWith('@inflexa-ai/solid/'))).toEqual([])
  expect(names.filter((name) => name.startsWith('react/'))).toEqual([])
  expect(config.env).toEqual(typescript().env)
})

test('a function outside the tests declares its return type', () => {
  const blocks = (solid().overrides ?? []).filter((override) => override.files.includes('**/*.{ts,tsx}'))

  expect(blocks.map((block) => block.rules?.['typescript/explicit-function-return-type']).filter(Boolean)).toEqual([
    ['error', { allowExpressions: true, allowTypedFunctionExpressions: true }],
  ])
})

test('the version option sets the Solid version of the settings', () => {
  expect(solid({ version: 1 }).settings).toEqual({ solid: { version: 1 } })
  expect(solid({ version: 2 }).settings).toEqual({ solid: { version: 2 } })
})

test('the version option changes the settings only', () => {
  expect(solid({ version: 2 })).toEqual({ ...solid(), settings: { solid: { version: 2 } } })
})

test('without the version option the settings hold no solid key', () => {
  expect(solid().settings).toEqual(typescript().settings)
  expect(solid().settings ?? {}).not.toHaveProperty('solid')
})
