# Proposal

## Why

The typed rules run in ESLint, because oxlint gives a JS plugin no type information, and typescript-eslint accepts only `typescript <6.1.0`. TypeScript 7.0.2 exports only `version` from its root, thus the move to TypeScript 7 (#5) fails. TypeScript 7 exports `typescript/unstable/sync`, which gives a program with the diagnostics of `tsc` and a checker, so one command can report the diagnostics of `tsc --noEmit` and the typed rules together (#16).

## What Changes

- A new package `@inflexa-ai/typecheck` in `oxlint/typecheck/`, with the bin `inflexa-typecheck`, built on `typescript/unstable/sync`. It reads each tsconfig of `-p`, or `./tsconfig.json`, prints the diagnostics of `tsc --noEmit --pretty false` and the reports of the typed rules in the format of `tsc`, and exits with 1 on a problem.
- A configuration file, `typecheck.config.ts`, default-exports `typecheck({ plugins, overrides })`. Each override turns on rules for globs with options, in the form of the `overrides` of oxlint. A repository adds its own rule modules as a plugin.
- `// typecheck-disable-next-line <rule> -- <reason>` suppresses a rule report on the next line. A directive without a reason is an error, and a directive that suppresses nothing is an error.
- A rule tester for the typed rules, exported as `@inflexa-ai/typecheck/rule-tester`.
- The typed rules of the command: `must-use-result` (a port of `@ninoseki/eslint-plugin-neverthrow` 0.3.2 with the extensions of the inflexa subsystems and the `consumers` option), `require-abort-signal` (moved from ESLint), and `no-generated-empty-object-type` (a port of the typescript-eslint rule). The React package gives `@inflexa-ai/react/no-inline-query-key` (moved from ESLint) and `@inflexa-ai/react/no-void-query-fn` (a port of the TanStack Query rule) through its `./typecheck` entry.
- **BREAKING** The `./eslint` entries of both oxlint packages, `oxlint/eslint.config.js`, and the dependencies on `eslint`, `typescript-eslint` and `@typescript-eslint/*` go away. The oxlint rules use the plugin types of `@oxlint/plugins`. `require-abort-signal` leaves `@inflexa-ai/oxlint-plugin`, and `no-inline-query-key` leaves the oxlint plugin of the React package.
- **BREAKING** `directive-guard` reports each `eslint-disable` directive, because no tool reads that form after this change.
- The workspace moves to `typescript` 7.0.2, which closes #5. The self-lint runs oxlint, `inflexa-typecheck` and `directive-guard`.
- The packages share the version 0.4.0, thus the merge into `main` releases them.
- A measurement of the command against `tsc --noEmit` and the ESLint run of today, on harness and himmel.

## Capabilities

### New Capabilities

- `typecheck-command`: the command `inflexa-typecheck`, its projects, its output, its exit status, its configuration file, its plugins, its disable directive, its rule interface and its rule tester.

### Modified Capabilities

- `typed-rules`: the typed rules run in `inflexa-typecheck` and not in ESLint, and the set of typed rules grows by `must-use-result`, `no-generated-empty-object-type` as a rule of this repository, and `no-void-query-fn`.
- `directive-guard`: the command reports each `eslint-disable` directive.
- `self-linting`: the workspace has no ESLint configuration, and `npm run lint` runs `inflexa-typecheck` in place of ESLint.
- `oxlint-configuration`: the directive forms name `inflexa-typecheck` in place of ESLint.
- `lint-rule-documentation`: the rules of the typecheck plugins carry a document and a document URL.
- `package-licensing`: the typecheck package declares Apache-2.0 and carries the license text, and each package with a ported rule carries the notice of the upstream license.
- `package-ci`: the release stages and publishes the typecheck package, and each staged package carries its notice file.

## Impact

- Code: a new workspace `oxlint/typecheck/`; `oxlint/typescript/src` (rule types, `eslint.ts`, `require-abort-signal`, `helpers/type-information.ts`, `helpers/reflective-calls.ts`, the directive guard); `oxlint/react/src` (rule types, `eslint.ts`, `no-inline-query-key`, a new `./typecheck` entry); `oxlint/scripts/release.mjs`; `oxlint/package.json`, the workspace manifests and `package-lock.json`; `.github/workflows/release-oxlint.yml`.
- Tests: the syntax rule tests move to the RuleTester of oxlint with no type bridge; the typed rule tests move to the new rule tester; new tests for the command, the configuration, the directives and each new rule.
- Documents: `README.md`, `oxlint/README.md`, the package READMEs, a README for the typecheck package, `docs/rules/must-use-result.md`, `docs/rules/no-generated-empty-object-type.md`, `docs/rules/no-void-query-fn.md`, and updates of `docs/rules/require-abort-signal.md` and `docs/rules/no-inline-query-key.md`.
- Dependencies: `typescript` 7.0.2 with its native binary; `@oxlint/plugins` for the rule types. The third-party oxlint JS plugins of the React package still pull `eslint` and `@typescript-eslint/utils` as their own dependencies.
- Consumers: a repository replaces `eslint.config.js` with `typecheck.config.ts`, runs `inflexa-typecheck` in place of `tsc --noEmit` and `eslint`, and moves each `eslint-disable` directive. The first publication of `@inflexa-ai/typecheck` is local, because npm accepts a trusted publisher only for a package that exists.
