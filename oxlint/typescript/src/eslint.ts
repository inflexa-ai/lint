import type { Linter } from 'eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import { NAMESPACE, plugin } from './plugin.ts'

export type TypedRulesOptions = {
  /**
   * The directory of the eslint.config.js that calls the factory:
   * `import.meta.dirname`. typescript-eslint otherwise finds it from the call
   * stack, and a config that a package builds is not on that stack, thus the
   * value falls back to the working directory in silence.
   */
  tsconfigRootDir: string
  /** Globs that no configuration reaches, beside `dist/` and `coverage/`. */
  ignores?: string[]
}

/**
 * The part of the lint of Inflexa that oxlint cannot run yet, as an ESLint
 * configuration. oxlint gives a JS plugin no type information, thus the rules
 * of this plugin that read types run here: `require-abort-signal`, and
 * `no-inline-query-key` of the React plugin. tsgolint does not have
 * `no-generated-empty-object-type` yet, thus that rule of typescript-eslint
 * runs here too.
 *
 * The typed rules of this plugin name no files. A repository applies each one
 * in its own blocks, with its options.
 *
 * ESLint reads `eslint-disable` and oxlint reads `oxlint-disable`, thus a
 * directive for a rule of this configuration is an `eslint-disable`.
 */
export function typescript({ tsconfigRootDir, ignores = [] }: TypedRulesOptions): Linter.Config[] {
  if (!tsconfigRootDir) {
    throw new Error('@inflexa-ai/oxlint-plugin/eslint: pass `tsconfigRootDir: import.meta.dirname` from eslint.config.js.')
  }

  return defineConfig([
    // The oxlint configuration is TypeScript that no tsconfig of a repository
    // usually lists, thus the project service would refuse to parse it, and no
    // typed rule has anything to say about it.
    globalIgnores(['**/dist/**', '**/coverage/**', '**/oxlint.config.{ts,mts}', ...ignores]),
    {
      name: '@inflexa-ai/linter-options',
      // A directive that no longer suppresses anything is a leftover exception.
      linterOptions: { reportUnusedDisableDirectives: 'error' },
    },
    {
      name: '@inflexa-ai/typed-rules',
      files: ['**/*.{ts,tsx}'],
      extends: [tseslint.configs.base],
      plugins: { [NAMESPACE]: plugin },
      languageOptions: { parserOptions: { projectService: true, tsconfigRootDir } },
      rules: { '@typescript-eslint/no-generated-empty-object-type': 'error' },
    },
  ])
}
