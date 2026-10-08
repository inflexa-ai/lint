# Tasks

## 1. Failing test

- [x] 1.1 Add a helper to `oxlint/typescript/src/rules/test/rule-documents.ts` that reports each message and each document of the rules of a plugin that advises `AbortSignal.any` without Chrome 116, Edge 116, Firefox 124 and Safari 17.4. Call it from `oxlint/typecheck/src/rules/test/documentation.test.ts` and `oxlint/react/src/rules/test/documentation.test.ts`. Verify that both tests fail and name `require-abort-signal` and `use-query-signal`, their messages, and their documents.

## 2. Fix

- [x] 2.1 Name the versions and point to the rule document in the `missingSignal` message of `oxlint/typecheck/src/rules/require-abort-signal.ts` and the `ignoredSignal` message of `oxlint/react/src/rules/use-query-signal.ts`. Verify that the messages pass the new test.
- [x] 2.2 In `docs/rules/require-abort-signal.md`, name the versions and add the section "Combine signals in an older browser" with the function, its minimum versions, and the fact that it removes its listeners when the combined signal aborts. Verify that the document passes the new test.
- [x] 2.3 In `docs/rules/use-query-signal.md`, name the versions and link to the section of 2.2. Verify that the document passes the new test and that the anchor matches the heading.
- [x] 2.4 Run the function of 2.2 in Node against a manual abort, a deadline, and a signal that is already aborted. Verify that the combined signal aborts each time with the reason of the source signal.

## 3. Verify

- [x] 3.1 Run the test files of both rules and both documentation tests, and verify that they pass.
- [x] 3.2 At `oxlint/`, run `npm run typecheck`, `npm run lint` and `npm run format:check`, then run `npm test` one time, and verify that each passes.
