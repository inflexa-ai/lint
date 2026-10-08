# Proposal

## Why

The messages of `require-abort-signal` and `use-query-signal`, and the documents of both rules, tell a developer to combine the query signal with a deadline through `AbortSignal.any`. `AbortSignal.any` first shipped in Chrome 116, Edge 116, Firefox 124 and Safari 17.4, while a consumer such as `inflexa-ai/himmel` builds for `chrome111`, `edge111`, `firefox114`, `safari16.4` and `ios16.4`. A developer who obeys the advice writes a call that throws a `TypeError` on Chrome 111 to 115, Firefox 114 to 123 and Safari 16.4 to 17.3. (#27)

## What Changes

- The `missingSignal` message of `require-abort-signal` and the `ignoredSignal` message of `use-query-signal` keep `AbortSignal.any`, name the first versions that ship it, and point to the rule document for an older browser.
- `docs/rules/require-abort-signal.md` names the same versions and gains a section with a function that combines signals with the APIs that an older browser has.
- `docs/rules/use-query-signal.md` names the same versions and links to that section, so the function has one copy.
- The documentation tests of `@inflexa-ai/typecheck` and of the oxlint rules of `@inflexa-ai/oxlint-plugin-react` fail when a message or document of their rules advises `AbortSignal.any` and does not name each of those versions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `lint-rule-documentation`: adds the requirement that the advice to combine signals names the first browser versions of `AbortSignal.any` and gives a form for an older browser.

## Impact

- Code: the message strings of `oxlint/typecheck/src/rules/require-abort-signal.ts` and `oxlint/react/src/rules/use-query-signal.ts`. Message ids, data, options and the reported calls stay the same.
- Documents: `docs/rules/require-abort-signal.md` and `docs/rules/use-query-signal.md`.
- Tests: a helper in `oxlint/typescript/src/rules/test/rule-documents.ts`, called from the documentation tests of the typecheck package and of the React rules.
- Consumers: the message text changes. No configuration changes.
