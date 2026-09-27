# typed-rules Specification

## Purpose

The rules that read the types of typescript-eslint run in ESLint, because oxlint gives a JS plugin no type information, and a typed rule never passes a file in silence.

## Requirements

### Requirement: ESLint runs the rules that oxlint cannot run

The `./eslint` entry of `@inflexa-ai/oxlint-plugin` SHALL export `typescript({ tsconfigRootDir, ignores })`, which returns an ESLint configuration: the parser of typescript-eslint with the project service for TypeScript files, the plugin of the package, `@typescript-eslint/no-generated-empty-object-type` as an error, and `reportUnusedDisableDirectives: 'error'`. It SHALL ignore `oxlint.config.ts` and `oxlint.config.mts`. The `./eslint` entry of `@inflexa-ai/oxlint-plugin-react` SHALL export `react()`, which adds the React plugin. A repository SHALL apply `require-abort-signal` and `no-inline-query-key` in its own blocks.

#### Scenario: A repository runs a typed rule

- **WHEN** a repository applies `@inflexa-ai/require-abort-signal` to its source in `eslint.config.js`, and a call into the client carries no `signal`
- **THEN** ESLint reports the call

### Requirement: A typed rule stops a run without type information

`require-abort-signal` and `no-inline-query-key` SHALL throw an error when the file has no program of typescript-eslint. The message SHALL name the rule and the ESLint configuration that gives type information.

#### Scenario: oxlint runs a typed rule

- **WHEN** an oxlint configuration turns on `@inflexa-ai/require-abort-signal`
- **THEN** oxlint reports an error for each file that names the rule and `@inflexa-ai/oxlint-plugin/eslint`, and does not report the file as clean
