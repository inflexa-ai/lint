# Spec Delta

## MODIFIED Requirements

### Requirement: The factory returns the root configuration

`typescript()` of `@inflexa-ai/oxlint-plugin`, `react()` of `@inflexa-ai/oxlint-plugin-react` and `solid()` of `@inflexa-ai/oxlint-plugin-solid` SHALL each return a root oxlint configuration, not an object for `extends`. Each JS plugin SHALL appear as an absolute path that the package resolves from its own location. The blocks of a repository SHALL come through the `overrides` option, after the blocks of the package.

#### Scenario: A consumer loads the configuration from the published packages

- **WHEN** a repository installs `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react`, `oxlint` and `oxlint-tsgolint`, and its `oxlint.config.ts` default-exports `react()`
- **THEN** oxlint loads the plugin of each package and the TanStack plugins from the installed packages, and runs the type-aware rules

#### Scenario: A Solid repository loads the configuration from the published packages

- **WHEN** a repository installs `@inflexa-ai/oxlint-plugin-solid`, `@inflexa-ai/oxlint-plugin`, `oxlint`, `oxlint-tsgolint`, `eslint` and `typescript`, and its `oxlint.config.ts` default-exports `solid()`
- **THEN** oxlint loads the plugin of the TypeScript package, the plugin of the Solid package and `eslint-plugin-solid` from the installed packages

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
