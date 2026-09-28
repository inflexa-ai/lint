import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig, resolveRules, typecheck } from '../config.ts'
import { TypecheckLoadError } from '../errors.ts'
import type { RuleModule, RuleOptions } from '../rule.ts'
import { stringArraysOnly } from '../rule-options.ts'
import { writeProjects } from './projects.ts'

const index = fileURLToPath(new URL('../index.ts', import.meta.url))

function fakeRule<Options extends RuleOptions>(defaultOptions: Options, checkOptions?: (options: Options) => string | undefined): RuleModule<Options> {
  return {
    meta: { docs: { description: 'A rule of the tests', url: 'https://example.com' }, messages: {}, defaultOptions },
    create: () => ({}),
    checkOptions,
  }
}

const BUILTINS = {
  'must-use-result': fakeRule({ consumers: ['one'] }, stringArraysOnly),
  'require-abort-signal': fakeRule({ declaredIn: [] }, stringArraysOnly),
  'no-generated-empty-object-type': fakeRule({}),
}

/** The ids and options of the rules that are on for a file. */
function activeFor(config: ReturnType<typeof typecheck>, file: string): Record<string, RuleOptions> {
  return Object.fromEntries(
    resolveRules(config, BUILTINS)
      .rulesFor(file)
      .map(({ id, options }) => [id, options]),
  )
}

// The settings that a configuration in JavaScript can give and the types refuse.
const BAD_SEVERITIES = [`'warn'`, `['warn', {}]`, `['off', {}]`, `['error', 'x']`, `2`]

let root = ''
let cleanup = async (): Promise<void> => {}

beforeAll(async () => {
  const config = (overrides: string) => `import { typecheck } from ${JSON.stringify(index)}\nexport default typecheck({ overrides: ${overrides} })\n`
  ;({ root, cleanup } = await writeProjects({
    'default-name': { 'typecheck.config.ts': config(`[{ files: ['src/**'], rules: { 'must-use-result': 'error' } }]`) },
    named: { 'lint/typed.config.ts': config(`[{ files: ['lib/**'], rules: { 'require-abort-signal': 'error' } }]`) },
    none: { 'README.md': '' },
    'plain-object': { 'typecheck.config.ts': `export default { plugins: [], overrides: [] }\n` },
    ...Object.fromEntries(
      BAD_SEVERITIES.map((setting, index) => [`severity-${String(index)}`, { 'typecheck.config.ts': config(`[{ files: ['src/**'], rules: { 'must-use-result': ${setting} } }]`) }]),
    ),
  }))
})

afterAll(async () => {
  await cleanup()
})

describe('loadConfig', () => {
  it('loads typecheck.config.ts of the working folder', async () => {
    const config = await loadConfig(path.join(root, 'default-name'))
    expect(activeFor(config, 'src/a.ts')).toHaveProperty('must-use-result')
    expect(activeFor(config, 'lib/a.ts')).not.toHaveProperty('must-use-result')
  })

  it('loads the file of --config, relative to the working folder', async () => {
    const config = await loadConfig(path.join(root, 'named'), 'lint/typed.config.ts')
    expect(activeFor(config, 'lib/a.ts')).toHaveProperty('require-abort-signal')
  })

  it('stops on a --config file that does not exist, and names it', async () => {
    await expect(loadConfig(path.join(root, 'named'), 'lint/missing.config.ts')).rejects.toThrow(new TypecheckLoadError('Cannot find the configuration lint/missing.config.ts.'))
  })

  it('uses typecheck() when the working folder has no configuration', async () => {
    const config = await loadConfig(path.join(root, 'none'))
    expect(activeFor(config, 'src/a.ts')).toEqual({ 'no-generated-empty-object-type': {} })
    expect(activeFor(config, 'src/view.tsx')).toEqual({ 'no-generated-empty-object-type': {} })
    expect(activeFor(config, 'scripts/run.js')).toEqual({})
  })

  it('stops on a default export that typecheck() did not make', async () => {
    await expect(loadConfig(path.join(root, 'plain-object'))).rejects.toThrow(/typecheck.config.ts must default-export the value of `typecheck\(\)`/)
  })
})

describe('resolveRules', () => {
  it.each(BAD_SEVERITIES.map((setting, index) => [setting, index]))('stops on the setting %s, and names the rule and the permitted forms', async (_setting, index) => {
    const config = await loadConfig(path.join(root, `severity-${String(index)}`))
    expect(() => resolveRules(config, BUILTINS)).toThrow(new TypecheckLoadError("must-use-result: a setting is 'error', 'off' or ['error', options], where options is an object."))
  })

  it('keeps the default block before the overrides of the repository', () => {
    const config = typecheck({ overrides: [{ files: ['src/generated/**'], rules: { 'no-generated-empty-object-type': 'off' } }] })
    expect(activeFor(config, 'src/generated/a.ts')).toEqual({})
    expect(activeFor(config, 'src/a.ts')).toHaveProperty('no-generated-empty-object-type')
  })

  it('takes each rule from the last override that matches the file and names the rule', () => {
    const config = typecheck({
      overrides: [
        { files: ['src/**'], rules: { 'must-use-result': 'error' } },
        { files: ['src/legacy/**'], rules: { 'must-use-result': 'off' } },
        { files: ['src/legacy/kept.ts'], rules: { 'must-use-result': ['error', { consumers: ['kept'] }] } },
      ],
    })
    expect(activeFor(config, 'src/a.ts')['must-use-result']).toEqual({ consumers: ['one'] })
    expect(activeFor(config, 'src/legacy/a.ts')).not.toHaveProperty('must-use-result')
    expect(activeFor(config, 'src/legacy/kept.ts')['must-use-result']).toEqual({ consumers: ['kept'] })
  })

  it('keeps the options of an earlier override under a later severity without options', () => {
    const config = typecheck({
      overrides: [
        { files: ['src/**'], rules: { 'must-use-result': ['error', { consumers: ['unwrapOrThrow'] }] } },
        { files: ['src/loop/**'], rules: { 'must-use-result': 'off' } },
        { files: ['src/loop/**'], rules: { 'must-use-result': 'error' } },
      ],
    })
    expect(activeFor(config, 'src/loop/a.ts')['must-use-result']).toEqual({ consumers: ['unwrapOrThrow'] })
  })

  it('names the rules of a plugin after the name of the plugin object', () => {
    const plugin = { name: 'himmel', rules: { 'no-raw-date': fakeRule({}) } }
    const config = typecheck({ plugins: [plugin], overrides: [{ files: ['src/**'], rules: { 'himmel/no-raw-date': 'error' } }] })
    expect(activeFor(config, 'src/a.ts')).toHaveProperty('himmel/no-raw-date')
  })

  it('stops on a rule id that no rule has, and names it', () => {
    const config = typecheck({ overrides: [{ files: ['src/**'], rules: { 'must-use-results': 'error' } }] })
    expect(() => resolveRules(config, BUILTINS)).toThrow(new TypecheckLoadError('No rule has the id must-use-results.'))
  })

  it('stops on a plugin that loads twice under one name', () => {
    const plugin = { name: 'himmel', rules: {} }
    expect(() => resolveRules(typecheck({ plugins: [plugin, { ...plugin }] }), BUILTINS)).toThrow(new TypecheckLoadError('The plugin himmel loads twice.'))
  })

  it('stops on an option that the rule does not have, and names the rule and the key', () => {
    const config = typecheck({ overrides: [{ files: ['src/**'], rules: { 'require-abort-signal': ['error', { declared: [] }] } }] })
    expect(() => resolveRules(config, BUILTINS)).toThrow(new TypecheckLoadError('require-abort-signal has no option declared.'))
  })

  it('stops on an option of another kind than its default', () => {
    const config = typecheck({ overrides: [{ files: ['src/**'], rules: { 'must-use-result': ['error', { consumers: 'unwrapOrThrow' }] } }] })
    expect(() => resolveRules(config, BUILTINS)).toThrow(new TypecheckLoadError('must-use-result: the option consumers is a string, and it must be an array.'))
  })

  it('stops on an array option with an element that is not a string', () => {
    const config = typecheck({ overrides: [{ files: ['src/**'], rules: { 'must-use-result': ['error', { consumers: ['a', 1] }] } }] })
    expect(() => resolveRules(config, BUILTINS)).toThrow(new TypecheckLoadError('must-use-result: each element of the option consumers must be a string.'))
  })
})
