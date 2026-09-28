# Spec Delta

## MODIFIED Requirements

### Requirement: The workspace lints the packages with their own configuration

`oxlint/oxlint.config.ts` SHALL call `typescript()` of `@inflexa-ai/oxlint-plugin` over the source of the packages. Its only syntax-ban change SHALL be `regex: false`, because a lint rule matches text. `oxlint/typecheck.config.ts` SHALL default-export `typecheck()` of `@inflexa-ai/typecheck`. The workspace SHALL hold no ESLint configuration.

#### Scenario: The configuration exists and turns the regex ban off

- **WHEN** a reader opens `oxlint/oxlint.config.ts` and `oxlint/typecheck.config.ts`
- **THEN** the first calls `typescript()` with `syntax: { regex: false }`, the second default-exports `typecheck()`, and `oxlint/eslint.config.js` does not exist

### Requirement: The self-lint run reports zero messages

`npm run lint` from `oxlint/` SHALL run oxlint, `inflexa-typecheck` over the tsconfig of each package and of the workspace root, and the directive guard over the repository's own source, and SHALL report zero errors and zero warnings. The configuration SHALL carry no rule exception except the ones this capability names, each with its reason beside it: the regex ban off for the packages, and the guard's own test left out of the guard, because its code samples are directive text.

#### Scenario: A clean self-lint run

- **WHEN** a developer runs `npm run lint` from `oxlint/`
- **THEN** the run exits successfully and reports no messages

### Requirement: The plugins export the plugin object by name

Each oxlint plugin package, `@inflexa-ai/oxlint-plugin` and `@inflexa-ai/oxlint-plugin-react`, SHALL export its oxlint plugin object as a named export `plugin`. The `./plugin` entry of each of these packages SHALL re-export it as the default export with `export { plugin as default } from './plugin.ts'`, because oxlint loads the default export of a JS plugin. The `./typecheck` entry of `@inflexa-ai/oxlint-plugin-react` SHALL export its typecheck plugin as a named export `plugin`. No entry file SHALL carry `export default <identifier>`, so `export-at-declaration` holds for the entry files.

#### Scenario: The named export replaces the default export

- **WHEN** a reader opens the entry files of either oxlint plugin package
- **THEN** no `export default` names an identifier, `import { plugin } from '@inflexa-ai/oxlint-plugin'` gives the plugin object, and the default export of `@inflexa-ai/oxlint-plugin/plugin` is the same object

#### Scenario: The typecheck plugin of the React package

- **WHEN** a configuration imports `{ plugin }` from `@inflexa-ai/oxlint-plugin-react/typecheck`
- **THEN** the value is the typecheck plugin named `@inflexa-ai/react` with the rules `no-inline-query-key` and `no-void-query-fn`
