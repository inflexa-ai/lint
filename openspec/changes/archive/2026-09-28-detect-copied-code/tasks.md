# Tasks

## 1. Shared helpers

- [x] 1.1 Remove the private `variableFor` of `no-module-mocking` and of `export-at-declaration`, and import the helper of `static-names.ts`. Call `isGlobalIdentifier` in `no-module-mocking` where it repeated the body of that helper.
- [x] 1.2 Add `ruleDocumentProblems` to `oxlint/typescript/src/rules/test/rule-documents.ts`, and make the documentation test of each package assert that it returns no problem.

## 2. Copy detection

- [x] 2.1 Add `jscpd` 5.3.3 as a pinned dev dependency of the workspace, and `oxlint/.jscpd.json` with `minTokens: 50`, `minLines: 5` and `exitCode: 1`.
- [x] 2.2 Add `lint:jscpd` to `oxlint/package.json`, and run it at the end of `npm run lint`.
- [x] 2.3 Confirm that a copy of the old `no-module-mocking.ts` in the workspace makes `npm run lint:jscpd` exit with status 1.

## 3. Documentation

- [x] 3.1 Add the rule to keep one copy of each operation to `CONTRIBUTING.md` and `oxlint/README.md`.

## 4. Verification

- [x] 4.1 Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run format:check` in `oxlint/`.
