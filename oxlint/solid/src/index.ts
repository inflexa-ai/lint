import { fileURLToPath } from 'node:url'
import { typescript, type TypescriptOptions } from '@inflexa-ai/oxlint-plugin'
import solidTypescript from 'eslint-plugin-solid/configs/typescript'
import type { OxlintConfig } from 'oxlint'

export { plugin } from './plugin.ts'

/** The absolute path of a JS plugin, resolved from this package, which depends on it. */
function pluginPath(specifier: string): string {
  return fileURLToPath(import.meta.resolve(specifier))
}

export type SolidOptions = TypescriptOptions & {
  /**
   * The major version of Solid that the repository runs, which
   * `eslint-plugin-solid` reads from `settings.solid.version`. Absent, the
   * plugin applies the semantics of Solid 1.
   *
   * The option changes the settings only: the rules stay the rules of
   * `configs/typescript`, and a repository on Solid 2 turns on the rules of
   * `eslint-plugin-solid/configs/v2` in its own blocks.
   */
  version?: 1 | 2
}

/**
 * The oxlint configuration of a SolidJS repository: each block of
 * `typescript()` from `@inflexa-ai/oxlint-plugin`, and the rules of
 * `eslint-plugin-solid/configs/typescript`, which oxlint runs as a JS plugin.
 *
 * The rules of this plugin name no files here. Which folder holds the
 * components, and which file is the context factory of the repository, is a
 * decision of each repository, thus it applies them in its own blocks.
 */
export function solid({ version, overrides = [], ...options }: SolidOptions = {}): OxlintConfig {
  const base = typescript(options)

  return {
    ...base,
    jsPlugins: [...(base.jsPlugins ?? []), pluginPath('@inflexa-ai/oxlint-plugin-solid/plugin'), pluginPath('eslint-plugin-solid')],
    // oxlint reads `settings` from the root configuration only.
    settings: version === undefined ? base.settings : { ...base.settings, solid: { version } },
    overrides: [
      ...(base.overrides ?? []),
      {
        files: ['**/*.{ts,tsx}'],
        rules: { ...solidTypescript.rules, 'solid/prefer-show': 'error' },
      },
      ...overrides,
    ],
  }
}
