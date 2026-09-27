import { expect, test } from 'vitest'
import { typescript, vitest } from '../index.ts'

test('the vitest preset runs the native plugin and carries its recommended rules', () => {
  expect(vitest.plugins).toEqual(['vitest'])
  expect(vitest.jsPlugins).toBeUndefined()
  expect(Object.keys(vitest.rules ?? {})).toContain('vitest/expect-expect')
  expect(Object.keys(vitest.rules ?? {})).toContain('vitest/no-focused-tests')
  expect(vitest.rules).toMatchObject({ 'vitest/no-disabled-tests': 'warn' })
})

test('a repository applies the vitest preset to its test files', () => {
  const config = typescript({ overrides: [{ files: ['**/*.test.{ts,tsx}'], ...vitest }] })

  expect(config.overrides).toContainEqual({ files: ['**/*.test.{ts,tsx}'], plugins: ['vitest'], rules: vitest.rules })
})

test('without the preset the configuration names no vitest rule', () => {
  expect(JSON.stringify(typescript())).not.toContain('vitest/')
})
