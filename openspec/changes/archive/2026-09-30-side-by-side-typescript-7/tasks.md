# Tasks

## 1. Manifests

- [x] 1.1 Replace the `typescript` devDependency of `oxlint/package.json` with `@typescript/native` at `npm:typescript@7.0.2` and `typescript` at `npm:@typescript/typescript6@^6.0.2`, run `npm install` at `oxlint/`, and make sure `npm ls --all` exits 0
- [x] 1.2 In `oxlint/typecheck/package.json`, remove the `typescript` peer, add `dependencies."@typescript/native": "npm:typescript@7.0.2"`, and add the `./unstable/ast` and `./unstable/sync` exports with `source`, `types` and `default` conditions; verify with `npm install` and `npm ls @typescript/native`
- [x] 1.3 In `oxlint/react/package.json`, remove `typescript` from `peerDependencies` and `peerDependenciesMeta`; verify with `npm install`

## 2. Sources

- [x] 2.1 Add `oxlint/typecheck/src/unstable/ast.ts` and `oxlint/typecheck/src/unstable/sync.ts`, each a `export *` of the matching `@typescript/native/unstable/*` module, and verify `npm run build` at `oxlint/typecheck` emits `dist/unstable/ast.d.ts` and `dist/unstable/sync.d.ts`
- [x] 2.2 Change each `typescript/unstable/ast` and `typescript/unstable/sync` import in `oxlint/typecheck/src/**` (`run.ts`, `engine.ts`, `rule.ts`, `rule-tester.ts`, `diagnostics.ts`, `directives.ts`, `helpers/reflective-calls.ts`, the three rules, `test/test-plugin.ts`) to `@typescript/native/unstable/*`, and verify `npm run typecheck` at `oxlint/typecheck` passes
- [x] 2.3 Change the imports of `oxlint/react/src/typed-rules/no-inline-query-key.ts` and `no-void-query-fn.ts` from `typescript/unstable/*` to `@inflexa-ai/typecheck/unstable/*`, and verify `npm run typecheck` at `oxlint/react` passes
- [x] 2.4 In `oxlint/typecheck/src/test/tsc-output.test.ts`, resolve `@typescript/native/package.json` for `bin/tsc`, assert the resolved package version is `7.0.2`, and verify the test file passes in `npm test` at `oxlint/typecheck`

## 3. Documents

- [x] 3.1 In `oxlint/typecheck/README.md`, rewrite the Install section to the two alias lines, update the paragraph that explains the exact version, change the `Write a rule` example to import from `@inflexa-ai/typecheck/unstable/ast`, and state the editor difference; verify the file names no `typescript@7.0.2` install and no `typescript/unstable` import
- [x] 3.2 In `oxlint/react/README.md`, rewrite the Install section for the fix: drop `typescript` from the optional-peer list, replace the `typescript` 7.0.2 install bullet with the two alias lines, and replace the known-issue note with the reason (`@typescript-eslint/utils` 8.71.0 peer range `>=4.8.4 <6.1.0`, typescript-eslint/typescript-eslint#10940), `npm ls --all` exits 0, and the editor difference; verify with the pin test of task 5.1
- [x] 3.3 In `oxlint/solid/README.md`, add the same layout instructions and reason to the Install section, and replace the `typescript` 7.0.2 install sentence in the Use section with them; verify with the pin test of task 5.3
- [x] 3.4 In `oxlint/README.md`, change the typed-rules install sentence to the layout and state that editors check with TypeScript 6 while `tsc` and `inflexa-typecheck` check with TypeScript 7

## 4. Release

- [x] 4.1 In `oxlint/scripts/release.mjs`, install `@typescript/native` and `typescript` from the root `devDependencies` into the smoke project, add a `npm ls --all` step that fails the release on a non-zero exit, and verify `node scripts/release.mjs` (dry run) passes

## 5. Tests

- [x] 5.1 Rewrite the README pin test in `oxlint/react/src/test/dependencies.test.ts` for the new install note (alias lines, peer range, release 8.71.0, issue 10940, editor difference), add manifest assertions that `peerDependencies` names no `typescript`, and assert the Install section holds no `typescript` 7.0.2 install instruction; verify the file passes
- [x] 5.2 Add a manifest test to the typecheck package that pins `dependencies."@typescript/native"` at `npm:typescript@7.0.2` and no `typescript` peer, and verify it passes
- [x] 5.3 Add a README pin test to the Solid package tests for its install note, which asserts the alias lines, the reason, and that no instruction installs `typescript` 7; verify it passes

## 6. Verification

- [x] 6.1 `npm ci` and `npm ls --all` exit 0 at `oxlint/`
- [x] 6.2 `npm run typecheck`, `npm test`, `npm run lint` and `npm run format:check` pass at `oxlint/`
- [x] 6.3 In a scratch consumer outside the repository: install the four tarballs of `.release/` with the documented layout, check `npm ls --all` exits 0, check `npm ls @typescript/native` shows one TS 7 deduped with the consumer alias, check `inflexa-typecheck` reports a type error while oxlint loads the React and Solid plugins, and turn on `@inflexa-ai/react/no-void-query-fn` in the consumer `typecheck.config.ts` to check its report through the new `./unstable/*` exports
- [x] 6.4 Draft the comment for inflexa-ai/himmel#23 in the final report (do not post it): the two alias devDependencies lines replace `typescript` 7.0.2, and the imports of repository rules move from `typescript/unstable/*` to `@inflexa-ai/typecheck/unstable/*`
