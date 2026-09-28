import { fileURLToPath } from 'node:url'
import type { OxlintConfig, OxlintEnv, OxlintOverride } from 'oxlint'
import { NAMESPACE } from './plugin.ts'
import { eslintRecommended, typescriptStrict } from './presets.ts'

export { plugin } from './plugin.ts'

/**
 * The disable directive that a message tells a person to write when no
 * replacement fits. A syntax ban is an entry of the built-in rule of ESLint,
 * which oxlint runs through `oxlint-plugin-eslint` under the name `eslint-js`,
 * thus the directive names that rule.
 */
const DISABLE = 'carries `// oxlint-disable-next-line eslint-js/no-restricted-syntax -- <reason>` saying why.'

/** The hint of a repository, as the second sentence of a message, or nothing. */
function withHint(message: string, hint: string | undefined): string {
  return hint ? `${message} ${hint}` : message
}

/**
 * `false` switches a ban off. An object keeps it on, and its `hint` names the
 * replacement that the repository offers, which a shared message cannot name.
 */
export type Ban = false | { hint?: string }

/** The syntax bans, each on unless a repository switches it off. */
export type SyntaxBans = { forEach?: Ban; jsonParse?: Ban; timers?: Ban; regex?: Ban }

/** One entry of `eslint-js/no-restricted-syntax`. */
export type RestrictedSyntax = { selector: string; message: string }

/**
 * The entries of `eslint-js/no-restricted-syntax` that the configuration below
 * applies to each source file. A repository that applies a subset to one zone
 * calls this with the same hints and writes the subset itself, because an
 * override replaces the options of a rule and nothing can subtract one entry.
 *
 * Each of the first three carries the qualified spellings beside the bare one.
 * `globalThis.JSON.parse`, `JSON['parse']`, `window.setTimeout` and
 * `new globalThis.RegExp` all name the same builtin, and a selector that reads
 * the bare identifier alone lets each of them through. Qualification and the
 * computed property are two axes that combine, thus the lists carry the cross
 * of the two.
 */
export function restrictedSyntax({ forEach = {}, jsonParse = {}, timers = {}, regex = {} }: SyntaxBans = {}): Record<keyof SyntaxBans, RestrictedSyntax | false> {
  return {
    forEach: forEach && {
      selector: "CallExpression[callee.property.name='forEach']",
      message:
        withHint(
          '`forEach` hides what the loop is for and cannot `break`, `continue` or `await`. Use `for...of` for a side effect, and `map`, `filter` or `reduce` for a value.',
          forEach.hint,
        ) + ` A call that neither replaces ${DISABLE}`,
    },
    jsonParse: jsonParse && {
      selector: [
        "CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
        "CallExpression[callee.object.property.name='JSON'][callee.property.name='parse']",
        "CallExpression[callee.object.name='JSON'][callee.property.value='parse']",
        "CallExpression[callee.object.property.name='JSON'][callee.property.value='parse']",
        "CallExpression[callee.object.property.value='JSON'][callee.property.name='parse']",
        "CallExpression[callee.object.property.value='JSON'][callee.property.value='parse']",
      ].join(', '),
      message:
        withHint('`JSON.parse` gives back `any` and proves nothing about it. Parse the value with a schema.', jsonParse.hint) + ` A parse that cannot take a schema ${DISABLE}`,
    },
    timers: timers && {
      selector: [
        "CallExpression[callee.name='setTimeout']",
        "CallExpression[callee.name='setInterval']",
        "CallExpression[callee.property.name='setTimeout']",
        "CallExpression[callee.property.name='setInterval']",
        "CallExpression[callee.property.value='setTimeout']",
        "CallExpression[callee.property.value='setInterval']",
      ].join(', '),
      message: withHint('A raw timer outlives whatever asked for it. Use a wait that ends on an `AbortSignal`.', timers.hint) + ` A timer that no wait replaces ${DISABLE}`,
    },
    regex: regex && {
      selector: [
        'Literal[regex]',
        "NewExpression[callee.name='RegExp']",
        "CallExpression[callee.name='RegExp']",
        "NewExpression[callee.property.name='RegExp']",
        "CallExpression[callee.property.name='RegExp']",
        "NewExpression[callee.property.value='RegExp']",
        "CallExpression[callee.property.value='RegExp']",
      ].join(', '),
      message:
        withHint(
          'A regular expression is the fallback and not the first idea. Use a parser, a zod schema, or a builtin that already knows the grammar: `URL` and `URLSearchParams`, `Intl.Segmenter`, `Date.parse`, or the string methods.',
          regex.hint,
        ) + ` A pattern that none of those replaces ${DISABLE}`,
    },
  }
}

/**
 * The vitest rules that oxlint runs in its native `vitest` plugin: the
 * recommended set of `@vitest/eslint-plugin`. A focused or skipped test, a test
 * with no assertion, and a malformed `expect` each pass a run that proves less
 * than it reads.
 *
 * oxlint builds the plugin in Rust, thus no JS plugin and no dependency goes
 * with this preset. The native `expect-expect` counts `expect`, `expectTypeOf`,
 * `assert` and `assertType` as assertions, so a type test that asserts through
 * the compiler is a test.
 *
 * The object names no files: a repository applies it to the globs of its test
 * files, as in `{ files: tests, ...vitest }`.
 */
export const vitest: Omit<OxlintOverride, 'files'> = {
  plugins: ['vitest'],
  rules: {
    'vitest/expect-expect': 'error',
    'vitest/no-commented-out-tests': 'error',
    'vitest/no-conditional-expect': 'error',
    'vitest/no-disabled-tests': 'warn',
    'vitest/no-focused-tests': 'error',
    'vitest/no-identical-title': 'error',
    'vitest/no-import-node-test': 'error',
    'vitest/no-interpolation-in-snapshots': 'error',
    'vitest/no-mocks-import': 'error',
    'vitest/no-standalone-expect': 'error',
    'vitest/no-unneeded-async-expect-function': 'error',
    'vitest/prefer-called-exactly-once-with': 'error',
    'vitest/require-local-test-context-for-concurrent-snapshots': 'error',
    'vitest/valid-describe-callback': 'error',
    'vitest/valid-expect': 'error',
    'vitest/valid-expect-in-promise': 'error',
    'vitest/valid-title': 'error',
  },
}

/**
 * The rules that keep `unknown` at the edge of a program. A value is `unknown`
 * until a schema parses it, and from there inward it travels as the type that
 * the schema proved. The object names no files: a repository applies it to the
 * code above its boundary, as in `{ files: ['src/**'], ...boundary }`, and
 * leaves out the client, the environment module, and the tests.
 */
export const boundary: Omit<OxlintOverride, 'files'> = {
  rules: {
    [`${NAMESPACE}/no-unknown-parameters`]: 'error',
    [`${NAMESPACE}/no-unknown-returns`]: 'error',
    [`${NAMESPACE}/no-unknown-type-aliases`]: 'error',
    [`${NAMESPACE}/no-unsafe-dictionary`]: 'error',
  },
}

export type TypescriptOptions = {
  /** Globs that no rule reaches, beside `node_modules/`, `dist/` and `coverage/`. */
  ignores?: string[]
  /** The environments whose globals the code sees, for example `{ browser: true }`. */
  env?: OxlintEnv
  /** Globs of the test files. */
  tests?: string[]
  syntax?: SyntaxBans
  /**
   * Import patterns that no source file can use, for example a library that one
   * module of the repository configures and hands on.
   */
  restrictedImports?: { group: string[]; message: string }[]
  /** Patterns of the files that can turn a thrown value into an `Error`. */
  instanceofErrorAllowIn?: string[]
  /** The package scopes and the workspace folders of the repository. */
  packages?: { scopes?: string[]; workspaces?: string[] }
  /**
   * The blocks of the repository, for example its zones. They come after the
   * blocks of this package, and oxlint takes each rule from the last block that
   * matches a file and names the rule.
   */
  overrides?: OxlintOverride[]
}

/**
 * The shared oxlint configuration of a TypeScript repository:
 * the recommended rules of ESLint, the strict type-checked preset of
 * typescript-eslint through tsgolint, and the rules for the shape of code and
 * for tests.
 *
 * It is the root configuration, not an object for `extends`: oxlint drops the
 * `env`, the `settings` and the `ignorePatterns` of an extended object. The
 * zone globs belong to the repository, because a glob in this package would
 * match nothing in a repository with a different layout.
 *
 * Two parts of the lint run outside of it: the rules that read the types of
 * TypeScript, through the command `inflexa-typecheck` of `@inflexa-ai/typecheck`,
 * and the guard of the disable directives, through the command `directive-guard`.
 */
export function typescript({
  ignores = [],
  env = {},
  tests = ['**/*.test.{ts,tsx,js}'],
  syntax = {},
  restrictedImports = [],
  instanceofErrorAllowIn = [],
  packages = {},
  overrides = [],
}: TypescriptOptions = {}): OxlintConfig {
  const bans = Object.values(restrictedSyntax(syntax)).filter((ban) => ban !== false)

  return {
    plugins: ['eslint', 'typescript'],
    // Absolute paths, because oxlint resolves a package name from the
    // configuration of the repository, which does not depend on these plugins.
    jsPlugins: [
      fileURLToPath(import.meta.resolve('@inflexa-ai/oxlint-plugin/plugin')),
      // oxlint reserves the name `eslint` for its native rules.
      { name: 'eslint-js', specifier: fileURLToPath(import.meta.resolve('oxlint-plugin-eslint')) },
    ],
    // oxlint turns on its `correctness` category by default. The blocks below
    // name each rule instead, as the presets of ESLint do.
    categories: { correctness: 'off' },
    options: {
      typeAware: true,
      // A directive that no longer suppresses anything is a leftover exception.
      reportUnusedDisableDirectives: 'error',
      // oxlint reads `oxlint-disable` only. No tool reads `eslint-disable`,
      // and `directive-guard` reports each one.
      respectEslintDisableDirectives: false,
    },
    env: { builtin: true, ...env },
    // oxlint skips `node_modules` only through the `.gitignore` of a repository.
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/coverage/**', ...ignores],
    overrides: [
      {
        files: ['**/*.{ts,tsx}'],
        rules: {
          ...eslintRecommended,
          ...typescriptStrict,
          // A caught value is `unknown`, and `String(error)` is the second half of
          // `error instanceof Error ? error.message : String(error)`. For a thrown
          // object it gives `[object Object]`, which is the one case that the
          // conversion was written for.
          'typescript/no-base-to-string': ['error', { checkUnknown: true }],
          // `() => setOpen(true)` is how a void callback is written; braces around
          // each handler add noise and catch nothing.
          'typescript/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
          // A number has one string form, thus `status ${response.status}` cannot
          // surprise anyone. Objects and nullish values stay forbidden. Each
          // option is written out, because an option left out takes the
          // permissive default of the rule, not the value of the strict preset.
          'typescript/restrict-template-expressions': ['error', { allowAny: false, allowBoolean: false, allowNullish: false, allowNumber: true, allowRegExp: false }],
          // An `as` tells the compiler to stop the check, and the value that it
          // describes usually came from outside the program, where nothing
          // guarantees the shape. Narrow it, give it a `satisfies`, or parse it
          // with a schema.
          'typescript/no-unsafe-type-assertion': 'error',
          // An inferred return type changes with the body and reaches each caller
          // with no error at the function. A callback and a function that a typed
          // binding receives already have a type from their context.
          'typescript/explicit-function-return-type': ['error', { allowExpressions: true, allowTypedFunctionExpressions: true }],
        },
      },
      {
        // The shape of code does not depend on where a file lives: it holds for
        // the application, the packages, the tests and the tooling alike.
        files: ['**/*.{ts,tsx,js,mjs}'],
        rules: {
          [`${NAMESPACE}/export-at-declaration`]: 'error',
          [`${NAMESPACE}/no-conditional-spread`]: 'error',
          [`${NAMESPACE}/no-double-cast`]: 'error',
          [`${NAMESPACE}/no-empty-schema`]: 'error',
          [`${NAMESPACE}/no-instanceof-error`]: ['error', { allowIn: instanceofErrorAllowIn }],
          [`${NAMESPACE}/no-interface`]: 'error',
          [`${NAMESPACE}/no-typeof-object`]: 'error',
          [`${NAMESPACE}/no-unknown-type-guards`]: 'error',
          [`${NAMESPACE}/package-entry-points`]: ['error', packages],
          // Each `as` that the compiler accepts is sound only because of something
          // that the types do not say. The rule asks for that invariant in a
          // SAFETY comment. no-double-cast and no-unsafe-type-assertion already
          // refuse the dangerous forms.
          [`${NAMESPACE}/require-assertion-safety`]: 'error',
          'eslint-js/no-restricted-syntax': bans.length > 0 ? ['error', ...bans] : 'off',
          'no-restricted-imports': restrictedImports.length > 0 ? ['error', { patterns: restrictedImports }] : 'off',
        },
      },
      {
        // A test varies a dependency by passing it in, never by swapping the
        // module under it: a module mock runs a graph that the program never
        // assembles.
        files: tests,
        rules: {
          [`${NAMESPACE}/no-module-mocking`]: 'error',
          [`${NAMESPACE}/test-placement`]: 'error',
          // A test helper has its callers in the same file.
          'typescript/explicit-function-return-type': 'off',
        },
      },
      ...overrides,
    ],
  }
}
