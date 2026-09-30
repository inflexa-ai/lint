# Tasks

## 1. Guard tests for the typecheck directives

- [x] 1.1 Add tests to `oxlint/typescript/src/directives/test/architecture-directives.test.ts` that a `typecheck-disable-next-line` directive in a line comment and in a block comment, naming a rule of the guarded prefix, gets one report at the start of the comment, and run the file to see each new report test fail
  - Held before the change: nothing. The new report test failed with `expected [] to deeply equal [ObjectContaining{…}]`.
- [x] 1.2 Add tests that a typecheck directive which names only rules of another prefix stays silent, that a blanket typecheck directive with no rule stays silent, that a `typecheck-enable` directive stays silent as `eslint-enable` and `oxlint-enable` stay silent today, and that `typecheck-disable-next` and `typecheck-disabled` are no directives; run the file before the implementation, and write in the task notes which of these silence tests already held, because they pass both before and after the change
  - Held before the change: all of them. Both silence tests passed on the pre-implementation run, so the other-prefix cases, the blanket cases, `typecheck-enable`, `typecheck-disable-next` and `typecheck-disabled` were silent before and stay silent after.
- [x] 1.3 Add tests that each `typecheck-disable` and `typecheck-disable-line` directive gets a report: with a rule of the guarded prefix, with a rule of another prefix, blanket, and with a reason; run the file to see each fail
  - Held before the change: nothing. Each case of the new `it.each` failed with `expected 0 to be 1`.
- [x] 1.4 Add tests for the inline-allowed path over the typecheck form (a reason is accepted, no reason gets a report whose hint names `typecheck-disable-next-line <rule> -- <reason>`, each rule of a mixed list is judged on its own), for the dead-form message naming the exact form that the file carries, and a CLI case that exits 1 and prints `file:line:column` for a typecheck directive; run the file to see each fail
  - Held before the change: only the reason-accepted case, which is a silence case. The no-reason hint test, the mixed-list test, the dead-form message test and the CLI test each failed.

## 2. Guard implementation

- [x] 2.1 In `oxlint/typescript/src/directives/architecture-directives.ts`, extend both patterns with the `typecheck` keyword, capture the suffix, dispatch the live forms (`oxlint-disable` in each form, and `typecheck-disable-next-line` when it names a rule) through the rule-list parse, and give a `typecheck-disable-next-line` that names no rule no report, because `inflexa-typecheck` refuses it and it suppresses nothing; report each dead form (`eslint-disable` in each form, `typecheck-disable`, `typecheck-disable-line`) with a message that names the form the file carries; make the inline-allowed hint suggest the captured form; run the guard tests and see them pass
  - All 45 tests of the directives test file passed after the change. The message of each report about the `eslint-disable` family now names the suffixed form that the file carries, so the assertion of the existing `it.each` block dropped the closing backtick; the exact suffixed form stays pinned by the new dead-form message test.
  - The review pass widened the line-pattern gap class to the Unicode whitespace that the typecheck command's trim admits, with a test for each family case; the pass also aligned the divergence wording with the CR and line-separator facts and added the oxlint-family whitespace case.
- [x] 2.2 Update the doc comment of `findArchitectureDirectiveViolations` and the pattern comments for the typecheck family, and do a check of each changed comment against the comment rules
  - The doc comment now carries the three raw-text divergences from the typecheck command beside the string-literal trade-off, the pattern comment states which form each tool reads, and the blanket branch carries the reason for its silence.

## 3. Documents

- [x] 3.1 Extend the paragraph about the directive forms in `oxlint/README.md` and the line about the guard in `oxlint/typescript/README.md`, so a reader of either learns that the guard polices both tools' live forms and reports the forms that no tool reads

## 4. Verification

- [x] 4.1 Run the directives test file, then the full test suite of each workspace with `npm test` from `oxlint/`; every test passes
- [x] 4.2 Run `npm run lint` from `oxlint/`; oxlint, `inflexa-typecheck`, the directive guard over the workspace, and jscpd report zero messages
