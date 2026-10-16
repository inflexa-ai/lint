# oxlint-configuration Specification

## Purpose

The oxlint factories of the packages of the workspace give each repository of Inflexa one root configuration: the rule set of the former ESLint presets, the rules of this repository as JS plugins, and one directive form for each linter.

## Requirements

### Requirement: The factory returns the root configuration

`typescript()` of `@inflexa-ai/oxlint-plugin`, `react()` of `@inflexa-ai/oxlint-plugin-react` and `solid()` of `@inflexa-ai/oxlint-plugin-solid` SHALL each return a root oxlint configuration, not an object for `extends`. Each JS plugin SHALL appear as an absolute path that the package resolves from its own location. The blocks of a repository SHALL come through the `overrides` option, after the blocks of the package.

#### Scenario: A consumer loads the configuration from the published packages

- **WHEN** a repository installs `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react`, `oxlint` and `oxlint-tsgolint`, and its `oxlint.config.ts` default-exports `react()`
- **THEN** oxlint loads the plugin of each package and the TanStack plugins from the installed packages, and runs the type-aware rules

#### Scenario: A Solid repository loads the configuration from the published packages

- **WHEN** a repository installs `@inflexa-ai/oxlint-plugin-solid`, `@inflexa-ai/oxlint-plugin`, `oxlint` and `oxlint-tsgolint`, and its `oxlint.config.ts` default-exports `solid()`
- **THEN** oxlint loads the plugin of the TypeScript package, the plugin of the Solid package and `eslint-plugin-solid` from the installed packages

### Requirement: The rule set names each rule

The factory SHALL turn off the `correctness` category and name each rule. The rule set SHALL be the set that the ESLint factories turned on, plus `typescript/explicit-function-return-type`, except `no-octal`, `react-hooks/config`, `react-hooks/gating`, the `allowCompoundComponents` option of `only-export-components`, the `errorClassNames` option of `preserve-caught-error`, and the typed rules of the `typed-rules` capability.

#### Scenario: Only the named rules run

- **WHEN** oxlint lints a file with the configuration of `typescript()`
- **THEN** each rule that reports is a rule that the configuration names

### Requirement: Each tool reads its own directive form

The configuration SHALL set `respectEslintDisableDirectives: false` and `reportUnusedDisableDirectives: 'error'`. oxlint then reads `oxlint-disable` directives only, `inflexa-typecheck` reads `typecheck-disable-next-line` directives only, and no tool reads an `eslint-disable` directive.

#### Scenario: An ESLint directive does not silence an oxlint rule

- **WHEN** a file carries `// eslint-disable-next-line @inflexa-ai/no-interface` above an `interface`
- **THEN** oxlint reports `no-interface` for that interface, and `directive-guard` reports the directive

### Requirement: The syntax bans run as eslint-js/no-restricted-syntax

The factory SHALL register `oxlint-plugin-eslint` under the name `eslint-js`, and SHALL apply the syntax bans as `eslint-js/no-restricted-syntax`. Each ban message SHALL name that rule id in the directive that it tells a person to write.

#### Scenario: A syntax ban and its directive

- **WHEN** a file calls `forEach`, and a second call carries `// oxlint-disable-next-line eslint-js/no-restricted-syntax -- <reason>`
- **THEN** oxlint reports the first call only

### Requirement: The configuration leaves out generated folders

The configuration SHALL ignore `node_modules/`, `dist/` and `coverage/` at each depth, beside the globs of the `ignores` option.

#### Scenario: A repository without a .gitignore

- **WHEN** oxlint runs in a repository that has no `.gitignore`
- **THEN** it lints no file under `node_modules/`

### Requirement: A function outside the tests declares its return type

`typescript()` SHALL turn on `typescript/explicit-function-return-type` for each TypeScript file, with `allowExpressions: true` and `allowTypedFunctionExpressions: true`. It SHALL turn the rule off for the globs of the `tests` option. `react()` and `solid()` SHALL carry the same rule, because each builds on `typescript()`.

#### Scenario: An exported function with an inferred return type

- **WHEN** oxlint lints `src/total.ts` that holds `export function total(items: Item[]) { return items.length }` with the configuration of `typescript()`
- **THEN** `typescript/explicit-function-return-type` reports the function

#### Scenario: A callback and a typed function expression

- **WHEN** oxlint lints `const prices = items.map((item) => item.price)` and `const handler: Handler = (event) => event.id`
- **THEN** `typescript/explicit-function-return-type` reports neither function

#### Scenario: A helper in a test file

- **WHEN** oxlint lints `src/total.test.ts` that holds `const make = (n: number) => ({ n })`, and `tests` keeps its default
- **THEN** `typescript/explicit-function-return-type` reports nothing

### Requirement: react() gives React Doctor the React version of the repository

The `reactDoctor` option of `react()` SHALL be an object with a required `reactVersion` and an optional `files`, which defaults to each TypeScript file. `reactVersion` is `<major>`, `<major>.<minor>` or `<major>.<minor>.<patch>` in decimal digits, with no leading zero and a major of 1 or more. `react()` SHALL set `capabilities` of `settings['react-doctor']` to `react-compiler`, then `react:17` up to `react:<major>` with at most `react:30`, then `react:19.2` when the version is 19.2 or later. A major below 17 gives no version capability. A malformed `reactVersion` SHALL make `react()` throw an error that names the option and the value.

#### Scenario: A React 19.3 repository

- **WHEN** a repository calls `react({ reactDoctor: { reactVersion: '19.3' } })`
- **THEN** the capabilities are `react-compiler`, `react:17`, `react:18`, `react:19` and `react:19.2`, and the React Doctor block applies to `**/*.{ts,tsx}`

#### Scenario: A React 18 repository

- **WHEN** a repository calls `react({ reactDoctor: { reactVersion: '18.3.1', files: ['src/**'] } })`
- **THEN** the capabilities are `react-compiler`, `react:17` and `react:18`, and the React Doctor block applies to `src/**`

#### Scenario: A ref callback that returns a cleanup in React 19

- **WHEN** `react-doctor/no-ref-callback-cleanup-before-react-19` lints a ref callback that returns a cleanup function, with the React Doctor settings of `react({ reactDoctor: { reactVersion: '19.3' } })`
- **THEN** the rule reports nothing, and with the settings of `reactVersion: '18.3'` it reports the callback

#### Scenario: The rules for React 19 run

- **WHEN** `react-doctor/no-react19-deprecated-apis` lints a call of `createFactory` from `react`, with the React Doctor settings of `react({ reactDoctor: { reactVersion: '19.3' } })`
- **THEN** the rule reports the call. eslint-plugin-react-doctor 0.9.14 does not read the `requires` list of a rule in oxlint, thus this scenario guards that the version settings turn no React 19 rule off

#### Scenario: A major above the ladder

- **WHEN** a repository calls `react({ reactDoctor: { reactVersion: '999999999' } })`
- **THEN** `react()` returns at once, and the ladder ends at `react:30`

#### Scenario: A malformed version

- **WHEN** a repository calls `react({ reactDoctor: { reactVersion: '^19.3.0' } })`
- **THEN** `react()` throws an error that names `reactVersion` and `^19.3.0`

### Requirement: react() keeps the React Doctor settings of the configs that it copies

When the `reactDoctor` option is set, `settings['react-doctor']` SHALL hold each setting that the `recommended` and `tanstack-query` configs of `eslint-plugin-react-doctor` give under `react-doctor`, beside `capabilities`. Without the option, the configuration SHALL name nothing of React Doctor.

#### Scenario: The curated rule mode reaches React Doctor

- **WHEN** a repository calls `react({ reactDoctor: { reactVersion: '19.3' } })` with `eslint-plugin-react-doctor` 0.9.14
- **THEN** `settings['react-doctor']` holds `portedRuleMode: 'curated'` beside `capabilities`

#### Scenario: No React Doctor option

- **WHEN** a repository calls `react()` with no `reactDoctor` option
- **THEN** the configuration names nothing of React Doctor

### Requirement: The README documents the limits of the upstream rules

`oxlint/README.md` SHALL hold a section on the known false reports of the upstream rules that `typescript()` turns on, and on the unit of the positions in the JSON output of oxlint. Each rule entry SHALL name the rule, the versions where a probe saw the report, whether typescript-eslint reports the same code, and a workaround that compiles and that the rule does not report. The entry of the JSON output SHALL name the oxlint version, the unit of each position, and the conversion. The rules SHALL stay on.

#### Scenario: A cast that adds a member

- **WHEN** a developer reads the entry of `typescript/no-unnecessary-type-assertion`
- **THEN** it states that tsgolint reports a cast to an intersection that adds a member that a later access reads, that typescript-eslint does not report it, and that a type annotation on the variable in place of the cast compiles with no report

#### Scenario: A union with one deprecated member

- **WHEN** a developer reads the entry of `typescript/no-deprecated`
- **THEN** it states that the rule reports each read of a property that one member of a union deprecates, that typescript-eslint does the same, and gives a narrow with `in` on a property of the member that the code reads

#### Scenario: A void Result of neverthrow

- **WHEN** a developer reads the entry of `typescript/no-invalid-void-type`
- **THEN** it states that the rule reports `void` as a type argument of a call such as `ok<void, E>()`, that typescript-eslint does the same, and gives `ok()` and `okAsync()` with no argument, with `void` kept in the annotated type such as `ResultAsync<void, E>`

#### Scenario: A throw that never returns and a declared error union

- **WHEN** a developer reads the entry of `typescript/only-throw-error`
- **THEN** it states that the rule reports `throw await` of a `Promise<never>` and a throw of a plain-object type, that typescript-eslint does the same, and gives `return await` for the first and the `allow` option in a block of the repository for the second

#### Scenario: The byte unit of the JSON output

- **WHEN** a developer reads the entry of the JSON output of oxlint
- **THEN** it states that `span.offset` and `span.column` count UTF-8 bytes and that `span.line` counts lines, thus a tool that edits by a character offset converts the byte offset or uses `span.line`
