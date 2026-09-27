import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { typescript, type TypescriptOptions } from '@inflexa-ai/oxlint-plugin'
import tanstackQuery from '@tanstack/eslint-plugin-query'
import tanstackRouter from '@tanstack/eslint-plugin-router'
import playwrightPlugin from 'eslint-plugin-playwright'
import testingLibraryPlugin from 'eslint-plugin-testing-library'
import type { OxlintConfig, OxlintOverride } from 'oxlint'

export { plugin } from './plugin.ts'

/** The absolute path of a JS plugin, resolved from this package, which depends on it. */
function pluginPath(specifier: string): string {
  return fileURLToPath(import.meta.resolve(specifier))
}

/** One entry of `better-tailwindcss/no-restricted-classes`. */
export type RestrictedClass = { pattern: string; message: string }

// SAFETY: `require` of an ES module returns its namespace, and the type names
// the namespace of the same package. The specifier type admits no other one.
const loadReactDoctor = createRequire(import.meta.url) as (specifier: 'eslint-plugin-react-doctor') => typeof import('eslint-plugin-react-doctor')

/**
 * The rules of React Doctor, with its TanStack Query rules on top. Three of
 * them repeat a rule of the native `react` plugin, which the React block
 * already runs, thus they stay off and a site reports once.
 *
 * The plugin is an optional peer, thus it loads only when a repository asks
 * for it. The factory is synchronous, and `require` loads the ES module of the
 * plugin synchronously.
 */
function reactDoctorRules(): Record<string, 'error' | 'warn' | 'off'> {
  const { default: reactDoctorPlugin } = loadReactDoctor('eslint-plugin-react-doctor')
  return {
    ...Object.fromEntries([reactDoctorPlugin.configs.recommended, reactDoctorPlugin.configs['tanstack-query']].flat().flatMap((config) => Object.entries(config.rules))),
    'react-doctor/rules-of-hooks': 'off',
    'react-doctor/exhaustive-deps': 'off',
    'react-doctor/only-export-components': 'off',
  }
}

/**
 * The presets of TanStack Query and TanStack Router, for the code of an
 * application. The strict preset of Query declares the key and the function of
 * a query together with `queryOptions()`, so that a key cannot drift from the
 * request that it caches. The preset of Router holds the order of the options
 * of a route, which its type inference reads from the top down.
 *
 * The object names no files: a repository applies it to its application code,
 * as in `{ files: ['src/**'], ...tanstack }`.
 */
export const tanstack: Omit<OxlintOverride, 'files'> = {
  jsPlugins: [pluginPath('@tanstack/eslint-plugin-query'), pluginPath('@tanstack/eslint-plugin-router')],
  rules: Object.fromEntries(
    [tanstackQuery.configs['flat/recommended-strict'], tanstackRouter.configs['flat/recommended']].flat().flatMap((config) => Object.entries(config.rules ?? {})),
  ),
}

export type ReactOptions = TypescriptOptions & {
  /**
   * The Tailwind rules, for each file that can carry a class. The plugin reads
   * the entry stylesheet to learn the theme, thus a token that the repository
   * defines is a class that it knows. `entryPoint` is relative to the working
   * directory of the lint run.
   *
   * The plugin is an optional peer: npm installs nothing for Tailwind beside
   * this package, and a repository that sets this option installs
   * `eslint-plugin-better-tailwindcss` itself. This package only resolves the
   * path of the plugin, and oxlint loads it.
   *
   * An arbitrary value that the scale already names is a number that nobody can
   * search for: `max-w-[40rem]` and `max-w-160` paint the same width, but only
   * the second says which step of the scale it is. The rule fires only where a
   * canonical class exists, thus a real one-off stays writable.
   *
   * `restrict` holds the classes that no component of the repository writes,
   * each with the message that names what to write instead. Absent, the rule
   * that restricts classes stays off.
   */
  tailwind?: { entryPoint: string; restrict?: RestrictedClass[] }
  /**
   * React Doctor, for the React code of the repository: the recommended rules,
   * with the TanStack Query rules on top. The mistakes that the rules of hooks
   * do not see: state that copies a prop, a set state after an await, a query
   * that reads a key it does not own. The React Compiler memoizes each
   * component, so the rules that ask for a manual `useMemo` stay off, through
   * the `react-compiler` capability that this option declares.
   *
   * `true` applies the rules to each TypeScript file. A repository that names
   * its own globs hands them over as `files`, for example the source of its
   * apps and packages, with its extensions left out.
   *
   * The plugin is an optional peer: a repository that sets this option
   * installs `eslint-plugin-react-doctor` itself.
   */
  reactDoctor?: true | { files: string[] }
}

/**
 * The rules of Testing Library, for the component tests of a React
 * repository. A test reads the screen as a person does: by role and name
 * through `screen`, through `user-event`, and never by walking DOM nodes. A
 * test written that way survives a change of the markup.
 *
 * The object names no files: a repository applies it to the globs of its
 * component tests, as in `{ files: componentTests, ...testingLibrary }`.
 */
export const testingLibrary: Omit<OxlintOverride, 'files'> = {
  jsPlugins: [pluginPath('eslint-plugin-testing-library')],
  rules: Object.fromEntries([testingLibraryPlugin.configs['flat/react']].flat().flatMap((config) => Object.entries(config.rules ?? {}))),
}

/**
 * The rules of the Playwright plugin, for the end-to-end tests of a React
 * repository. A fixed wait, an assertion that is not awaited, and a locator
 * that is not a role each make an end-to-end test slow or flaky.
 *
 * The rule of hooks stays off: a Playwright fixture hands its value on through
 * a callback named `use`, which the rule reads as the React hook, and no React
 * runs in an end-to-end test.
 *
 * The object names no files: a repository applies it to the globs of its
 * end-to-end tests, as in `{ files: e2eTests, ...playwright }`.
 */
export const playwright: Omit<OxlintOverride, 'files'> = {
  jsPlugins: [pluginPath('eslint-plugin-playwright')],
  rules: {
    ...Object.fromEntries([playwrightPlugin.configs['flat/recommended']].flat().flatMap((config) => Object.entries(config.rules ?? {}))),
    'react/rules-of-hooks': 'off',
  },
}

/**
 * The oxlint configuration of a React repository: each block of `typescript()`
 * from `@inflexa-ai/oxlint-plugin`, the browser globals, and the recommended
 * rules of React hooks and of React Refresh for Vite, which oxlint runs as its
 * native `react` plugin.
 *
 * The rules of this plugin name no files here. Which folder is application
 * code, a shared package, or the one place where raw effects are written is a
 * decision of each repository, thus it applies them in its own blocks.
 */
export function react({ tailwind, reactDoctor, overrides = [], env, ...options }: ReactOptions = {}): OxlintConfig {
  const base = typescript({ ...options, env: { browser: true, ...env } })

  const jsPlugins = [...(base.jsPlugins ?? []), pluginPath('@inflexa-ai/oxlint-plugin-react/plugin')]
  if (reactDoctor) jsPlugins.push(pluginPath('eslint-plugin-react-doctor'))
  if (tailwind) jsPlugins.push(pluginPath('eslint-plugin-better-tailwindcss'))

  const settings: NonNullable<OxlintConfig['settings']> = { ...base.settings }
  if (reactDoctor) settings['react-doctor'] = { capabilities: ['react-compiler'] }
  if (tailwind) settings['better-tailwindcss'] = { entryPoint: tailwind.entryPoint }

  const tailwindRules: NonNullable<OxlintOverride['rules']> = { 'better-tailwindcss/enforce-canonical-classes': 'error' }
  if (tailwind?.restrict) {
    tailwindRules['better-tailwindcss/no-restricted-classes'] = ['error', { restrict: tailwind.restrict }]
  }

  return {
    ...base,
    plugins: [...(base.plugins ?? []), 'react'],
    jsPlugins,
    // oxlint reads `settings` from the root configuration only.
    settings: Object.keys(settings).length > 0 ? settings : base.settings,
    overrides: [
      ...(base.overrides ?? []),
      {
        files: ['**/*.{ts,tsx}'],
        rules: {
          'react/rules-of-hooks': 'error',
          'react/exhaustive-deps': 'warn',
          'react/static-components': 'error',
          'react/use-memo': 'error',
          'react/preserve-manual-memoization': 'error',
          'react/incompatible-library': 'warn',
          'react/immutability': 'error',
          'react/globals': 'error',
          'react/refs': 'error',
          'react/set-state-in-effect': 'error',
          'react/error-boundaries': 'error',
          'react/purity': 'error',
          'react/set-state-in-render': 'error',
          'react/unsupported-syntax': 'warn',
          // `config` and `gating` of the React hooks preset are absent: they
          // check the options of the compiler, and oxlint runs the compiler
          // with fixed options. `allowCompoundComponents` of the Vite preset is
          // absent too: oxlint does not have the option.
          'react/only-export-components': ['error', { allowConstantExport: true }],
        },
      },
      ...(reactDoctor ? [{ files: reactDoctor === true ? ['**/*.{ts,tsx}'] : reactDoctor.files, rules: reactDoctorRules() } satisfies OxlintOverride] : []),
      ...(tailwind ? [{ files: ['**/*.{ts,tsx}'], rules: tailwindRules } satisfies OxlintOverride] : []),
      ...overrides,
    ],
  }
}
