# Tasks

## 1. The ban helper in the TypeScript package

- [x] 1.1 Before the move, add to `oxlint/react/src/rules/test/react-primitive-ban.test.ts` one case for each of `no-raw-effect`, `no-raw-state` and `no-raw-context` that asserts the full rendered `message` text, and one `export *` case with its full message, and verify that they pass
- [x] 1.2 Move `oxlint/react/src/helpers/react-primitive-ban.ts` to `oxlint/typescript/src/helpers/primitive-ban.ts` as `createPrimitiveBan` with the `module` option and the messages of design.md, point the React rules `no-raw-context`, `no-raw-effect` and `no-raw-state` at `@inflexa-ai/oxlint-plugin/helpers/primitive-ban`, delete the old file, and verify that `react-primitive-ban.test.ts` passes with the cases of 1.1 and that `npm run typecheck` passes

## 2. The version and the Solid package

- [x] 2.1 Set the version of `oxlint/typescript/package.json` and `oxlint/react/package.json` to `0.4.0`, set the dependency of the React package on `@inflexa-ai/oxlint-plugin` to `^0.4.0`, run `npm install` in `oxlint/`, and verify that the lock file changes only the versions and ranges of the workspace packages
- [x] 2.2 Copy `LICENSE`, `tsconfig.json`, `tsconfig.build.json` and `vitest.config.ts` from `oxlint/react/` to `oxlint/solid/`. Write `package.json` (version `0.4.0`, `@inflexa-ai/oxlint-plugin` at `^0.4.0`), `src/index.ts`, `src/plugin.ts` and `src/js-plugin.ts` as design.md describes, with no React, TanStack, Testing Library or Playwright content. Add `solid` to the workspaces of `oxlint/package.json`, run `npm install` in `oxlint/`, and verify that the lock file gains the workspace link and `eslint-plugin-solid` 0.18.x with no change to the other packages
- [x] 2.3 Add `solid/src/plugin.ts` to the files that bridge the rule types in `oxlint/oxlint.config.ts`, and verify that `npm run typecheck` passes

## 3. The factory solid()

- [x] 3.1 Add the factory tests under `oxlint/solid/src/test/` for the scenarios of the `solid-plugin` spec: the paths in `jsPlugins`, each rule of `eslint-plugin-solid/configs/typescript` with its severity and options, `solid/prefer-show` as `error`, no rule of `@inflexa-ai/solid/` and no `react/` rule, `env` equal to the `env` of `typescript()`, `typescript/explicit-function-return-type` in the `**/*.{ts,tsx}` block that `solid()` returns, the blocks of the repository last, `settings.solid.version` for `version: 1` and `version: 2`, and no `solid` key without the option; see them fail
- [x] 3.2 Write `solid()` as design.md describes, and verify that the factory tests pass
- [x] 3.3 In a scratch project under `tmp/claude/`, run oxlint with `solid({ version: 1 })` and `solid({ version: 2 })` on a file that holds `createEffect(() => read(), [dependency])`. oxlint obeys `.git/info/exclude`, which hides `tmp/`, thus give it the explicit file path and make sure that it reports one linted file. Verify that only the first run reports `solid/no-react-deps`, and record the commands and the output in the report

## 4. The rule no-raw-context

- [x] 4.1 Add the rule tests of `no-raw-context` for the scenarios of the spec and each form of the helper (named import and alias, re-export, namespace member, namespace destructure, `export *`, type-only import, a React import, a dynamic import, the `names` and `hint` options); see them fail
- [x] 4.2 Write the rule with `createPrimitiveBan` and `module: 'solid-js'`, register it in the plugin, and verify that its tests pass
- [x] 4.3 Write `docs/rules/solid-no-raw-context.md` with the sections of `docs/rules/no-raw-context.md` and the Solid reason of design.md, add the documentation test of the Solid package that expects `solid-<rule name>.md`, and verify that it passes
- [x] 4.4 Change the module of the rule to `'react'`, run its tests, see them fail at the Solid cases, restore the rule, and record the failure in the report

## 5. The rule require-cleanup

- [x] 5.1 Add the rule tests of `require-cleanup` for the scenarios of the spec and each form of design.md: a component by name (declaration, variable, named function expression) and by JSX return, a render callback nested in a component; a member `on` (also `['on']`), `addEventListener` and `setInterval` as a global and as a member; `onCleanup` by named import, by alias, by namespace and with the import below the use; a local binding that shadows `onCleanup`; one cleanup for more than one subscription; and the cases that stay quiet (nested callbacks that are not components, a function that is not a component, module scope, a local `setInterval`, a cleanup of another module); see them fail
- [x] 5.2 Write the rule, register it in the plugin, and verify that its tests pass
- [x] 5.3 Write `docs/rules/solid-require-cleanup.md`. It gives what the rule leaves alone from design.md, the limit that one `onCleanup` satisfies each subscription of its function, and the timers ban of `typescript()` with `syntax: { timers: false }`. Verify that the documentation test passes
- [x] 5.4 Make the rule attribute each `onCleanup` call to each component that holds it at any depth, not only to its nearest function. Run its tests, and see them fail at the scenario "A cleanup in a different function". Restore the rule, and record the failure in the report

## 6. The release

- [x] 6.1 Add `'solid'` to `PACKAGES` in `oxlint/scripts/release.mjs`, add the smoke run of `solid()` from design.md, add `oxlint/solid/package.json` to the paths of `.github/workflows/release-oxlint.yml`, and make its header name no package list. Verify that `node --check scripts/release.mjs` passes and that the workflow paths list each package manifest (task 9.1 runs the script)

## 7. The documents

- [x] 7.1 Update `oxlint/README.md` (the table, a Solid example, and the release text on the shared version and the dependency on the exact version of the TypeScript package), the root `README.md`, `oxlint/react/README.md`, the doc comment of `ARCHITECTURE_RULES` in `oxlint/typescript/src/directives/architecture-directives.ts`, and write `oxlint/solid/README.md` with the install list of design.md, the timers ban note, and the note that `version: 2` does not turn on the rules of `configs/v2`. Verify that none of these files names the packages or the plugins with a count

## 8. The comparison on the cli

- [x] 8.1 Copy the source of `/Users/s-ved/repos/inflexa/inflexa/cli` (read only) to `tmp/claude/cli-copy/`. Install `eslint-plugin-solid` 0.18.0 and 0.14.5 in scratch folders under `tmp/claude/` (0.14.5 needs `--legacy-peer-deps`, because its peer range stops at ESLint 9). Lint the TypeScript and TSX files of the copy with ESLint 10 and `eslint-plugin-solid/configs/typescript` of each version, both with `--no-inline-config`, and with oxlint and `solid()` (type-aware rules off, the explicit list of files, because oxlint does not lint a folder under `tmp/`). Make sure that oxlint and ESLint lint the same number of files. Verify that each `solid/*` report of ESLint with 0.18.0 appears in the oxlint output with the same file, line, column and rule. Verify that each `solid/*` report of ESLint with 0.14.5 (the cli today) also appears in the oxlint output. If one does not, name the change of `eslint-plugin-solid` 0.15 to 0.18 that removes it and list it in the report for the coordinator. Record the report counts and each report that only one side gives, with its cause

## 9. Checks

- [x] 9.1 Run `node scripts/release.mjs` in `oxlint/` (a dry run: it runs the format check, the type check, the tests, the lint and the build, then stages, packs and smoke-tests the packages), and verify that it passes and that `.release/` holds the staged Solid package, whose manifest names `@inflexa-ai/oxlint-plugin` at exactly `0.4.0`
