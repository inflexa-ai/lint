# Tasks

## 1. Rules

- [x] 1.1 In `oxlint/typecheck/src/rules/require-abort-signal.ts`, add `hint: string` to the options with the default `''`, build `missingSignal` and `missingSignalWithHint` from one function of the advice, and report `missingSignalWithHint` with the data `{ problem, hint }` when the hint is not empty. In `require-abort-signal.test.ts`, add a case with a hint that expects `missingSignalWithHint` and that data, a case with `hint: ''` that expects `missingSignal` and only the data `problem`, and a check that the template of `missingSignalWithHint` holds `{{hint}}`, `AbortSignal.timeout(ms)` and the advice of a wrapper, and does not name `AbortSignal.any`. Verify that the test file passes.
- [x] 1.2 In `oxlint/react/src/rules/use-query-signal.ts`, add the schema and the default of `hint`, build `ignoredSignal` and `ignoredSignalWithHint` from one function of the advice, and report `ignoredSignalWithHint` with the data `{ hint }` when the hint is not empty. In `use-query-signal.test.ts`, add a case with a hint that expects the full message text, and a case with `hint: ''` that expects `ignoredSignal`. Verify that the test file passes.

## 2. Documents

- [x] 2.1 Describe `hint` in the `Options` section of `docs/rules/require-abort-signal.md`, and add an `Options` section with `hint` to `docs/rules/use-query-signal.md`. Verify that the documentation tests of the typecheck and React packages pass.

## 3. Verify

- [x] 3.1 At `oxlint/`, run `npm run typecheck`, `npm run lint` and `npm run format:check`, then run `npm test` one time, and verify that each passes.
