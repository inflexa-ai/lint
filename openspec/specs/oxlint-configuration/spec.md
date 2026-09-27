# oxlint-configuration Specification

## Purpose

The oxlint factories of the two packages give each repository of Inflexa one root configuration: the rule set of the former ESLint presets, the rules of this repository as JS plugins, and one directive form for each linter.

## Requirements

### Requirement: The factory returns the root configuration

`typescript()` of `@inflexa-ai/oxlint-plugin` and `react()` of `@inflexa-ai/oxlint-plugin-react` SHALL each return a root oxlint configuration, not an object for `extends`. Each JS plugin SHALL appear as an absolute path that the package resolves from its own location. The blocks of a repository SHALL come through the `overrides` option, after the blocks of the package.

#### Scenario: A consumer loads the configuration from the published packages

- **WHEN** a repository installs both packages, `oxlint` and `oxlint-tsgolint`, and its `oxlint.config.ts` default-exports `react()`
- **THEN** oxlint loads the plugin of each package and the TanStack plugins from the installed packages, and runs the type-aware rules

### Requirement: The rule set names each rule

The factory SHALL turn off the `correctness` category and name each rule. The rule set SHALL be the set that the ESLint factories turned on, except `no-octal`, `react-hooks/config`, `react-hooks/gating`, the `allowCompoundComponents` option of `only-export-components`, the `errorClassNames` option of `preserve-caught-error`, and the typed rules of the `typed-rules` capability.

#### Scenario: Only the named rules run

- **WHEN** oxlint lints a file with the configuration of `typescript()`
- **THEN** each rule that reports is a rule that the configuration names

### Requirement: Each tool reads its own directive form

The configuration SHALL set `respectEslintDisableDirectives: false` and `reportUnusedDisableDirectives: 'error'`. oxlint then reads `oxlint-disable` directives only, and ESLint reads `eslint-disable` directives only.

#### Scenario: An ESLint directive does not silence an oxlint rule

- **WHEN** a file carries `// eslint-disable-next-line @inflexa-ai/no-interface` above an `interface`
- **THEN** oxlint reports `no-interface` for that interface, and ESLint reports the directive as unused

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
