import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { inspect } from 'node:util'
import { TypecheckLoadError } from './errors.ts'
import type { OptionValue, Plugin, RuleModule, RuleOptions } from './rule.ts'

export type Severity = 'error' | 'off'

/** `'error'` keeps the options of an earlier override, and `['error', options]` sets them. */
export type RuleSetting = Severity | ['error', RuleOptions]

/** The rules of the files that `files` matches: globs relative to the working folder, as `path.matchesGlob` reads them. */
export type Override = { files: string[]; rules: Record<string, RuleSetting> }

export type TypecheckOptions = {
  /** The plugins of the repository, each with the rule modules under its name. */
  plugins?: Plugin[]
  /**
   * The blocks of the repository. They come after the block of this package,
   * and for a file and a rule the last block that matches the file and names
   * the rule decides.
   */
  overrides?: Override[]
}

/**
 * The value of `typecheck()`, which a configuration file default-exports. The
 * command accepts only an instance, thus a configuration always passed through
 * the factory and its default block.
 */
export class TypecheckConfig {
  readonly plugins: readonly Plugin[]
  readonly overrides: readonly Override[]

  constructor(plugins: readonly Plugin[], overrides: readonly Override[]) {
    this.plugins = plugins
    this.overrides = overrides
  }
}

/** A rule that is on for a file, with its options for that file. */
export type ActiveRule = { id: string; rule: RuleModule; options: RuleOptions }

export const CONFIG_FILE = 'typecheck.config.ts'

/**
 * The configuration of `inflexa-typecheck`. Its own block comes first and
 * turns on `no-generated-empty-object-type` for each TypeScript file, as the
 * former ESLint configuration did. Each other typed rule is on only where an
 * override of the repository turns it on.
 */
export function typecheck({ plugins = [], overrides = [] }: TypecheckOptions = {}): TypecheckConfig {
  return new TypecheckConfig(plugins, [{ files: ['**/*.{ts,tsx}'], rules: { 'no-generated-empty-object-type': 'error' } }, ...overrides])
}

/**
 * The configuration of the run: the file of `--config`, relative to the
 * working folder, or `typecheck.config.ts` of the working folder, or
 * `typecheck()` when the folder has none. Node strips the types of the file
 * when it loads it.
 */
export async function loadConfig(cwd: string, file?: string): Promise<TypecheckConfig> {
  const target = path.resolve(cwd, file ?? CONFIG_FILE)
  if (!existsSync(target)) {
    if (file === undefined) return typecheck()
    throw new TypecheckLoadError(`Cannot find the configuration ${file}.`)
  }
  const name = path.relative(cwd, target)
  let exported: unknown
  try {
    // The namespace of a module can lack a default export, thus the type leaves it optional and unknown.
    exported = await import(pathToFileURL(target).href).then((namespace: { default?: unknown }) => namespace.default)
  } catch (error) {
    throw new TypecheckLoadError(`Cannot load the configuration ${name}: ${inspect(error)}`, { cause: error })
  }
  if (!(exported instanceof TypecheckConfig)) throw new TypecheckLoadError(`${name} must default-export the value of \`typecheck()\` of @inflexa-ai/typecheck.`)
  return exported
}

type Kind = 'array' | 'string' | 'number' | 'boolean' | 'object' | 'null'

function kindOf(value: OptionValue): Kind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'object'
}

function withArticle(kind: Kind): string {
  return `${kind === 'array' || kind === 'object' ? 'an' : 'a'} ${kind}`
}

/** The options of a rule merged over its defaults, after the check of each key, each kind, and the check of the rule. */
export function mergeRuleOptions(id: string, rule: RuleModule, configured: RuleOptions): RuleOptions {
  const defaults = rule.meta.defaultOptions
  for (const [key, value] of Object.entries(configured)) {
    if (!Object.hasOwn(defaults, key)) throw new TypecheckLoadError(`${id} has no option ${key}.`)
    const expected = kindOf(defaults[key])
    const actual = kindOf(value)
    if (actual !== expected) throw new TypecheckLoadError(`${id}: the option ${key} is ${withArticle(actual)}, and it must be ${withArticle(expected)}.`)
  }
  const merged = { ...defaults, ...configured }
  const problem = rule.checkOptions?.(merged)
  if (problem !== undefined) throw new TypecheckLoadError(`${id}: ${problem}`)
  return merged
}

/**
 * Stops the run on a setting that is not `['error', options]` with an options
 * object. The types refuse such a setting, but a configuration in JavaScript,
 * or one written from the habits of oxlint (`'warn'`), can still give it.
 */
function checkSetting(id: string, setting: readonly unknown[]): void {
  // A string or a number reaches here from a configuration in JavaScript, thus the check of the array.
  const parts: readonly unknown[] = Array.isArray(setting) && setting.length === 2 ? setting : []
  const [severity, options] = parts
  // `Object(value)` is the value itself only for an object, thus a primitive, `null` and `undefined` fail.
  if (severity !== 'error' || Object(options) !== options || Array.isArray(options)) {
    throw new TypecheckLoadError(`${id}: a setting is 'error', 'off' or ['error', options], where options is an object.`)
  }
}

type ResolvedSetting = { id: string; rule: RuleModule; on: boolean; options: RuleOptions | undefined }

/**
 * The rules of the configuration by id: the rules of this package with no
 * prefix, and each rule of a plugin as `<plugin name>/<rule name>`. It checks
 * each id and each option once, before any file, and stops on the first
 * problem with a message that names the rule or the plugin.
 */
export function resolveRules(config: TypecheckConfig, builtins: Record<string, RuleModule>): { rulesFor(file: string): ActiveRule[] } {
  const registry = new Map(Object.entries(builtins))
  const pluginNames = new Set<string>()
  for (const plugin of config.plugins) {
    if (pluginNames.has(plugin.name)) throw new TypecheckLoadError(`The plugin ${plugin.name} loads twice.`)
    pluginNames.add(plugin.name)
    for (const [name, rule] of Object.entries(plugin.rules)) registry.set(`${plugin.name}/${name}`, rule)
  }

  const overrides = config.overrides.map(({ files, rules }) => ({
    files,
    settings: Object.entries(rules).map(([id, setting]): ResolvedSetting => {
      const rule = registry.get(id)
      if (rule === undefined) throw new TypecheckLoadError(`No rule has the id ${id}.`)
      if (setting === 'off') return { id, rule, on: false, options: undefined }
      if (setting === 'error') return { id, rule, on: true, options: undefined }
      checkSetting(id, setting)
      return { id, rule, on: true, options: mergeRuleOptions(id, rule, setting[1]) }
    }),
  }))

  return {
    rulesFor(file) {
      const state = new Map<string, { rule: RuleModule; on: boolean; options: RuleOptions | undefined }>()
      for (const { files, settings } of overrides) {
        if (!files.some((glob) => path.matchesGlob(file, glob))) continue
        for (const { id, rule, on, options } of settings) state.set(id, { rule, on, options: options ?? state.get(id)?.options })
      }
      return [...state].filter(([, { on }]) => on).map(([id, { rule, options }]) => ({ id, rule, options: options ?? rule.meta.defaultOptions }))
    },
  }
}
