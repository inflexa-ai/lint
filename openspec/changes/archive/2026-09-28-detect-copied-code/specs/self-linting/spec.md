# Spec Delta

## MODIFIED Requirements

### Requirement: The self-lint run reports zero messages

`npm run lint` from `oxlint/` SHALL run oxlint, ESLint for the typed rules, the directive guard, and jscpd over the repository's own source, and SHALL report zero errors and zero warnings. The configuration SHALL carry no rule exception except the ones this capability names, each with its reason beside it: the regex ban off for the packages, `no-double-cast` and `typescript/no-unsafe-type-assertion` off for the `plugin.ts` file of each package and the rule tester, which bridge the rule type universes, and the guard's own test left out of the guard, because its code samples are directive text.

#### Scenario: A clean self-lint run

- **WHEN** a developer runs `npm run lint` from `oxlint/`
- **THEN** the run exits successfully and reports no messages

## ADDED Requirements

### Requirement: The workspace holds one copy of each operation

An operation that more than one module of the workspace uses SHALL live in a shared helper that each module imports: a helper of the rules in `oxlint/typescript/src/helpers/`, and a helper of the tests in `oxlint/typescript/src/rules/test/`. `oxlint/.jscpd.json` SHALL scan the TypeScript and JavaScript files of the workspace, the tests included, except `node_modules`, `dist` and `.release`, with `minTokens: 50` and `minLines: 5`, and SHALL set `exitCode: 1`, so that `npm run lint:jscpd` fails on each clone that it finds.

#### Scenario: A copied helper fails the lint

- **WHEN** a module of the workspace declares its own copy of `variableFor` of `oxlint/typescript/src/helpers/static-names.ts`
- **THEN** `npm run lint:jscpd` from `oxlint/` names both places and exits with status 1

#### Scenario: The documentation tests share one helper

- **WHEN** a reader opens the `documentation.test.ts` of a package
- **THEN** the test asserts that `ruleDocumentProblems` of `oxlint/typescript/src/rules/test/rule-documents.ts` returns no problem for the plugin of that package
