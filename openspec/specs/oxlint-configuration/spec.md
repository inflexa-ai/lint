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
