# Tasks

## 1. The oxlint rules on the plugin types of oxlint

- [x] 1.1 Add `@oxlint/plugins` as a dependency of both oxlint packages, move each syntax rule and helper of `typescript/src` and `react/src` from `@typescript-eslint/utils` to the `Rule`, `Context`, `Plugin` and `ESTree` types of `@oxlint/plugins` with string literals for `node.type`, and verify that `npm run typecheck` passes for both packages
- [x] 1.2 Run the syntax rule tests in the `RuleTester` of `oxlint/plugins-dev` with no cast, remove the SAFETY casts of both `plugin.ts` files and of the rule tester and their exceptions in `oxlint/oxlint.config.ts`, and verify that the syntax rule tests and `npm run lint:oxlint` pass

## 2. directive-guard and eslint-disable

- [x] 2.1 Add guard tests for an `eslint-disable` directive in the line, next-line and block forms, with a rule of another prefix, with a reason, and blanket, and see them fail
- [x] 2.2 Report each `eslint-disable` directive, keep the prefix and inline rules for `oxlint-disable`, and verify that the guard tests pass

## 3. TypeScript 7 and the removal of ESLint

- [x] 3.1 Create the workspace `oxlint/typecheck/` (manifest with the bin `inflexa-typecheck`, the entries `.`, `./rule-tester` and `./helpers/*`, the peer `typescript` `7.0.2`, `files` with `dist` and `NOTICE`, tsconfigs, vitest config, `LICENSE`, `NOTICE` from `tmp/claude/licenses/`), add it to the workspaces, and verify that `npm run typecheck` sees it
- [x] 3.2 Remove `oxlint/eslint.config.js`, both `eslint.ts` entries and their exports, `require-abort-signal` and its test from the oxlint plugin, `no-inline-query-key` and its test from the oxlint plugin of the React package, `helpers/type-information.ts`, `helpers/reflective-calls.ts` (task 6.1 ports it), and the dependencies on `eslint`, `typescript-eslint` and `@typescript-eslint/*`; keep the cases of the removed typed tests for tasks 6.1 and 6.2 (`git show HEAD:<path>` reads them); update the comment of `respectEslintDisableDirectives` in `typescript/src/index.ts`; and verify that no source file imports `eslint`, `typescript-eslint`, `@typescript-eslint/` or the root of `typescript`, and that the syntax rule tests pass
- [x] 3.3 Move the workspace to `typescript` 7.0.2, give the React package the optional peers `typescript` `7.0.2` and `@inflexa-ai/typecheck` at the shared version in `peerDependenciesMeta`, drop the `eslint` and `typescript` peers of both oxlint packages, and verify that `npm install` and then `npm ci` succeed, that `package-lock.json` holds `node_modules/@typescript/typescript-linux-x64`, and that `npm run typecheck` passes with the native `tsc`

## 4. The command

- [x] 4.1 Add fixture projects (a type error, a syntax error, a declaration error with `declaration: true`, `allowImportingTsExtensions` without `noEmit`, `emitDeclarationOnly: true`, a tsconfig that does not parse, a chained message, a related location, an option error with no file, and a run from a parent folder with `-p <folder>`) and a test that compares the output of the command with the output of the installed `tsc --noEmit --pretty false`, and see it fail
- [x] 4.2 Open the projects of `-p` (a file or a folder, `./tsconfig.json` by default) in one API through a virtual tsconfig that extends the real one with `noEmit: true` and its `references`, collect, sort and format the diagnostics as `tsc` 7 does, print paths from the file names of the program, and verify that the comparison test passes
- [x] 4.3 Add tests for the configuration (`typecheck.config.ts`, `--config`, a missing file, the default block of `no-generated-empty-object-type`, the last matching override, `'off'`, a later `'error'` that keeps earlier options, an unknown rule id, a duplicate plugin name, an unknown option key, a wrong option kind, an array option with an element that is not a string, the ids of a plugin from the name of the plugin object) and see them fail
- [x] 4.4 Implement `typecheck()`, the loading of the configuration, the plugins, the rule ids and the options check, and verify that the configuration tests pass
- [x] 4.5 Add tests for the rule engine (one walk per file for all rules, a report at the start of the node, the data of a message, the order after the diagnostics, a file in two projects reported once in the first project of the `-p` order, declaration files, files under `node_modules` and files outside the working directory left out, the exit status) and see them fail
- [x] 4.6 Implement the engine, the report format and the exit status, and verify that the engine tests pass
- [x] 4.7 Add tests for `typecheck-disable-next-line` (a reason, no reason, no id, an unused id, an unknown id, an id that is off, a directive in a file where no rule is on, a block comment on one line and on more than one line, directive text in a string and a template, several ids, a `tsc` diagnostic that stays) and see them fail
- [x] 4.8 Implement the directive from the comment ranges of the AST, and verify that the directive tests pass
- [x] 4.9 Add the CLI `inflexa-typecheck` with `-p` and `--config`, a missing project, and a test of the process through `node`, and verify that it passes

## 5. The rule tester

- [x] 5.1 Add the rule tester of `./rule-tester` (one API per `run`, the case file through the file system callbacks, a snapshot per case after `clearSourceFileCache()`, `describe` and `it` of the framework), with tests of a valid case that reports, an invalid case with the wrong message id, data, line or column, and a passing run, and verify that they pass

## 6. The typed rules

- [x] 6.1 Port `helpers/reflective-calls.ts` into `typecheck/src/helpers/` and `require-abort-signal` to the TypeScript 7 API and the rule tester, test `declaredIn` on the file name of the resolved declaration, move each case of today with its result, and verify that the rule tests pass
- [x] 6.2 Port `no-inline-query-key` to the TypeScript 7 API as a rule of the `./typecheck` plugin of the React package, move each case of today with its result, and verify that the rule tests pass
- [x] 6.3 Add the tests of `must-use-result`: each case of the upstream test of `@ninoseki/eslint-plugin-neverthrow` 0.3.2 (`tmp/claude/ninoseki/`, with `if (res.isOk) {}` as a valid case, and each report at the position that upstream gives), the valid cases `return cond ? ok(1) : err('e')` and `const r = cond ? ok(1) : err('e'); r.unwrapOr(0)`, and each inflexa case of the spec, with a fixture of the neverthrow declarations, and see them fail
- [x] 6.4 Port `must-use-result` with the option `consumers`, and verify that its tests pass
- [x] 6.5 Port `no-generated-empty-object-type` with the cases of `tmp/claude/upstream/no-generated-empty-object-type.test.ts`, and verify that its tests pass
- [x] 6.6 Port `no-void-query-fn` into the `./typecheck` plugin of the React package with the cases of `tmp/claude/upstream/no-void-query-fn.test.ts`, add its `NOTICE` to the React package and its `files`, and verify that its tests pass
- [x] 6.7 Write `docs/rules/must-use-result.md`, `docs/rules/no-generated-empty-object-type.md` and `docs/rules/no-void-query-fn.md`, update `docs/rules/require-abort-signal.md` and `docs/rules/no-inline-query-key.md` for `inflexa-typecheck`, name the upstream rule and its license in the document of each ported rule, say in `must-use-result.md` that `tsc` reports `if (res.isOk)` only with `strictNullChecks`, extend the documentation tests to the rules of the typecheck package and of the React typecheck plugin with a check that each ported rule's document names its upstream package and `MIT`, and verify that they pass

## 7. The self-lint

- [x] 7.1 Add `oxlint/typecheck.config.ts` with `typecheck()`, include it in `oxlint/tsconfig.json`, set `npm run lint` to oxlint, `inflexa-typecheck` from source with a `-p` for each package and the root, and the directive guard, and verify that `npm run lint` reports nothing

## 8. The release and the documents

- [x] 8.1 Set the packages to 0.4.0, publish `typecheck`, `typescript`, `react` in that order in `scripts/release.mjs`, write the shared version into each staged dependency and peer dependency on a package of the workspace, stage `NOTICE`, replace the ESLint smoke check with an `inflexa-typecheck` run on a type error and a type that resolves to `{}`, add `oxlint/typecheck/package.json` to the paths and the header comment of `release-oxlint.yml`, and verify that `node scripts/release.mjs` (a dry run) passes
- [x] 8.2 Update `README.md`, `oxlint/README.md`, `oxlint/typescript/README.md` and `oxlint/react/README.md`, and write `oxlint/typecheck/README.md` (install, `typecheck.config.ts`, `-p`, the directive, the rule interface and tester, the output format and the problem matchers), in STE, and verify that no README names `eslint.config.js` or the `./eslint` entries

## 9. The measurement and the checks

- [x] 9.1 Measure on `/Users/s-ved/repos/inflexa/inflexa3/harness` and `/Users/s-ved/repos/inflexa/himmel` the time of `tsc --noEmit` 6, `tsc --noEmit` 7, the ESLint run of today and `inflexa-typecheck` with a scratch configuration under `tmp/claude/` that turns on the typed rules of each repository, with read-only commands only, and write the numbers, the reports of the command and the command lines to `tmp/claude/issue16-measurements.md` for the coordinator, who copies them into the Measurements section of design.md
- [x] 9.2 Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run format:check` in `oxlint/`, and verify that each passes
