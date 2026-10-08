# Proposal

## Why

The messages of `require-abort-signal` and `use-query-signal` advise `AbortSignal.any`, and a consumer cannot change that advice. `inflexa-ai/himmel` bans `AbortSignal.any` with `eslint-js/no-restricted-properties`, because its build target is below the first versions that ship it, and gives `signal.withDeadline(ms)` and `signal.or(...others)` instead. A developer in himmel who obeys the first message writes `AbortSignal.any`, and the ban reports that call. The two messages disagree. (#30)

## What Changes

- `require-abort-signal` and `use-query-signal` take an optional string option `hint`.
- When `hint` is not empty, the message holds the hint in place of the advice to combine signals, and keeps the rest of its text. That advice is the sentence that names `AbortSignal.any`, the sentence with its first browser versions, and the pointer to the rule document.
- Without the option, or with `hint: ''`, each rule reports the same message id, data and text as before.
- The documents of both rules describe the option.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `lint-rule-documentation`: adds the requirement that a repository can replace the advice to combine signals with its own hint.

## Impact

- Code: `oxlint/typecheck/src/rules/require-abort-signal.ts` and `oxlint/react/src/rules/use-query-signal.ts`. `use-query-signal` gets an options schema for the first time.
- Tests: `require-abort-signal.test.ts` and `use-query-signal.test.ts`.
- Documents: the `Options` section of `docs/rules/require-abort-signal.md` and a new `Options` section in `docs/rules/use-query-signal.md`.
- Consumers: no change without the option. A consumer such as himmel sets `hint` on each rule to name its own helpers.
