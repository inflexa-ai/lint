# Design

## Context

See proposal.md - Why. The rules of this repository with a `hint` option append the hint to the message, and an empty hint means no hint (`no-raw-network.ts`, `no-direct-zustand.ts`, `no-raw-text.ts`). This option replaces a part of the message, as #30 asks. The rule tester of `@inflexa-ai/typecheck` compares `data` exactly (`rule-tester.ts:48`), and `typed-rules` requires `require-abort-signal` to keep the message ids and data of its ESLint version. The guard of `rule-documents.ts` reads `meta.messages` to make sure that the advice to use `AbortSignal.any` names its first browser versions.

## Goals / Non-Goals

**Goals:**

- A repository names its own way to combine signals, and the two rules stop advising a call that the repository bans.
- A rule without the option reports exactly as before.

**Non-Goals:**

- Replace the advice of a deadline, `AbortSignal.timeout(ms)`. himmel bans only `AbortSignal.any`, and its `withDeadline` calls `AbortSignal.timeout`.
- Replace the documents. The documents keep the default advice and describe the option.

## Decisions

- **The hint replaces the advice. It is not appended.** #30 asks for this: an appended hint would leave the advice to use `AbortSignal.any` in the message, and the messages would still disagree.
- **A second message id carries the hint: `missingSignalWithHint` and `ignoredSignalWithHint`.** Its template is the template of the default id, with `{{hint}}` in place of the advice. A rule without a hint reports the default id with its current data. Alternative: one template with an `{{advice}}` placeholder, filled with the default advice or the hint. That adds a data key to each report, which breaks the requirement of `typed-rules` on the data of `require-abort-signal`. It also moves the default advice out of `meta.messages`, where the guard of `rule-documents.ts` reads it.
- **Both templates come from one function of the advice.** Each rule builds its two templates from one function that takes the advice, so the text around the advice has one copy.
- **An empty hint means no hint,** as in the other rules with a `hint` option.
- **The option of `require-abort-signal` is a default option.** `defaultOptions` gains `hint: ''`, so the configuration check of `inflexa-typecheck` refuses a hint that is not a string. `use-query-signal` gets a schema with `hint` and `additionalProperties: false`, as `no-direct-zustand` has.

## Risks / Trade-offs

- [A consumer that keys on the message id sees a new id when it sets a hint] → Only a consumer that sets the new option sees it. Without the option, the ids do not change.
