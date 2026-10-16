import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { createRuleTester } from '../rules/test/rule-tester.ts'
import { playwright, react, testingLibrary } from '../index.ts'

// SAFETY: `require` of an ES module returns its namespace, and the type names
// the namespace of the same package. The specifier type admits no other one.
const requireReactDoctor = createRequire(import.meta.url) as (specifier: 'eslint-plugin-react-doctor') => typeof import('eslint-plugin-react-doctor')
const { default: reactDoctorPlugin } = requireReactDoctor('eslint-plugin-react-doctor')

const settings19 = {
  'react-doctor': { portedRuleMode: 'curated', capabilities: ['react-compiler', 'react:17', 'react:18', 'react:19', 'react:19.2'] },
}
const settings18 = { 'react-doctor': { portedRuleMode: 'curated', capabilities: ['react-compiler', 'react:17', 'react:18'] } }

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
  const config = react({ reactDoctor: { reactVersion: '19.3' } })

  expect(config.jsPlugins).toContain(fileURLToPath(import.meta.resolve('eslint-plugin-react-doctor')))
  expect(config.settings).toEqual(settings19)

  const block = config.overrides?.find((override) => override.files.includes('**/*.{ts,tsx}') && override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.rules).toMatchObject({ 'react-doctor/query-stable-query-client': 'warn' })
})

test('the react doctor option leaves off the rules that the native react block already runs', () => {
  const config = react({ reactDoctor: { reactVersion: '19.3' } })

  const block = config.overrides?.find((override) => override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.rules).toMatchObject({
    'react-doctor/rules-of-hooks': 'off',
    'react-doctor/exhaustive-deps': 'off',
    'react-doctor/only-export-components': 'off',
  })
})

test('the react doctor option applies to each TypeScript file by default', () => {
  const config = react({ reactDoctor: { reactVersion: '19.3' } })

  const block = config.overrides?.find((override) => override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.files).toEqual(['**/*.{ts,tsx}'])
})

test('the react doctor option takes the version ladder of an older React and the globs of the repository', () => {
  const config = react({ reactDoctor: { reactVersion: '18.3.1', files: ['apps/*/src/**', 'packages/*/src/**'] } })

  expect(config.settings).toEqual(settings18)

  const block = config.overrides?.find((override) => override.files.includes('apps/*/src/**') && override.rules && 'react-doctor/rules-of-hooks' in override.rules)
  expect(block?.files).toEqual(['apps/*/src/**', 'packages/*/src/**'])
})

test.each([
  ['19', ['react-compiler', 'react:17', 'react:18', 'react:19']],
  ['19.1.0', ['react-compiler', 'react:17', 'react:18', 'react:19']],
  ['19.2', ['react-compiler', 'react:17', 'react:18', 'react:19', 'react:19.2']],
  ['20', ['react-compiler', 'react:17', 'react:18', 'react:19', 'react:20', 'react:19.2']],
  ['16.14', ['react-compiler']],
])('the react doctor option gives React %s the capabilities %j', (reactVersion, capabilities) => {
  expect(react({ reactDoctor: { reactVersion } }).settings?.['react-doctor']).toMatchObject({ capabilities })
})

test('the react doctor option ends the version ladder at React 30', () => {
  const ladder = Array.from({ length: 14 }, (_, i) => `react:${17 + i}`)

  expect(react({ reactDoctor: { reactVersion: '999999999' } }).settings?.['react-doctor']).toMatchObject({ capabilities: ['react-compiler', ...ladder, 'react:19.2'] })
})

test.each(['^19.3.0', '19.x', '019', '0', '19.03', '19.3.1.2', ''])('the react doctor option rejects the version %j', (reactVersion) => {
  expect(() => react({ reactDoctor: { reactVersion } })).toThrow(`reactDoctor.reactVersion must be a React version such as '19.3', and '${reactVersion}' is not one.`)
})

const refCallbackCleanup = `export function Box() {
  return <div ref={(node) => { const o = new ResizeObserver(() => {}); o.observe(node); return () => o.disconnect() }} />
}`

createRuleTester().run('react-doctor/no-ref-callback-cleanup-before-react-19', reactDoctorPlugin.rules['no-ref-callback-cleanup-before-react-19'], {
  valid: [{ code: refCallbackCleanup, settings: settings19 }],
  invalid: [{ code: refCallbackCleanup, settings: settings18, errors: 1 }],
})

// The plugin does not read `requires` in oxlint, thus this case guards that the version settings turn no React 19 rule off.
createRuleTester().run('react-doctor/no-react19-deprecated-apis', reactDoctorPlugin.rules['no-react19-deprecated-apis'], {
  valid: [],
  invalid: [{ code: `import { createFactory } from 'react'\nexport const div = createFactory('div')`, settings: settings19, errors: 1 }],
})

test('without the react doctor option the configuration names nothing of it', () => {
  expect(JSON.stringify(react())).not.toContain('react-doctor')
})

test('the tailwind restrict option turns on the rule with the restricted classes of the repository', () => {
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

test('without the tailwind restrict option no class is restricted', () => {
  const config = react({ tailwind: { entryPoint: './src/app.css' } })

  expect(config.overrides).toContainEqual({ files: ['**/*.{ts,tsx}'], rules: { 'better-tailwindcss/enforce-canonical-classes': 'error' } })
  expect(JSON.stringify(config)).not.toContain('no-restricted-classes')
})
