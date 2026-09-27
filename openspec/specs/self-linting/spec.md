# self-linting Specification

## Purpose

The repository lints its own lint packages with the configuration they publish, so the rules prove themselves on their own source.

## Requirements

### Requirement: The workspace lints the packages with their own configuration

`oxlint/oxlint.config.ts` SHALL call `typescript()` of `@inflexa-ai/oxlint-plugin` over the source of both packages. Its only syntax-ban change SHALL be `regex: false`, because a lint rule matches text. `oxlint/eslint.config.js` SHALL call `typescript()` of `@inflexa-ai/oxlint-plugin/eslint` with `tsconfigRootDir: import.meta.dirname`.

#### Scenario: The configuration exists and turns the regex ban off

- **WHEN** a reader opens `oxlint/oxlint.config.ts`
- **THEN** it calls `typescript()` with `syntax: { regex: false }`, and `oxlint/eslint.config.js` calls the ESLint `typescript()` with `tsconfigRootDir: import.meta.dirname`

### Requirement: The self-lint run reports zero messages

`npm run lint` from `oxlint/` SHALL run oxlint, ESLint for the typed rules, and the directive guard over the repository's own source, and SHALL report zero errors and zero warnings. The configuration SHALL carry no rule exception except the ones this capability names, each with its reason beside it: the regex ban off for the packages, `no-double-cast` and `typescript/no-unsafe-type-assertion` off for the two `plugin.ts` files and the rule tester, which bridge the rule type universes, and the guard's own test left out of the guard, because its code samples are directive text.

#### Scenario: A clean self-lint run

- **WHEN** a developer runs `npm run lint` from `oxlint/`
- **THEN** the run exits successfully and reports no messages

### Requirement: The plugins export the plugin object by name

Each package SHALL export its plugin object as a named export `plugin`. The `./plugin` entry of each package SHALL re-export it as the default export with `export { plugin as default } from './plugin.ts'`, because oxlint loads the default export of a JS plugin. No entry file SHALL carry `export default <identifier>`, so `export-at-declaration` holds for the entry files.

#### Scenario: The named export replaces the default export

- **WHEN** a reader opens the entry files of either package
- **THEN** no `export default` names an identifier, `import { plugin } from '@inflexa-ai/oxlint-plugin'` gives the plugin object, and the default export of `@inflexa-ai/oxlint-plugin/plugin` is the same object
