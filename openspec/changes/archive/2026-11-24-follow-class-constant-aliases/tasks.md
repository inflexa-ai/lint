# Tasks

## 1. The rule

- [x] 1.1 In `oxlint/react/src/rules/test/class-constant-name.test.ts`, add the alias scenarios of the spec delta, and make sure that they fail before the change.
- [x] 1.2 In `oxlint/react/src/rules/class-constant-name.ts`, follow a local `const` to its initializer. Make sure that the test passes.
- [x] 1.3 In `docs/rules/class-constant-name.md`, state the alias rule and the array of objects that the rule does not report.

## 2. Release

- [x] 2.1 Bump the shared packages to 0.10.1, and update `oxlint/package-lock.json`.
- [x] 2.2 At `oxlint/`, run the release dry run, which runs the format check, the type check, the tests, the lint, the build and the smoke install.
