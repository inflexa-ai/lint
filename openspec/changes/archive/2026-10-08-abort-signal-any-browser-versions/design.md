# Design

## Context

See proposal.md - Why. The version data comes from the browser compatibility data of MDN (`api.AbortSignal.any_static`): Chrome 116, Firefox 124 and Safari 17.4, with Edge mirroring Chrome and iOS Safari mirroring Safari. `AbortSignal.timeout` ships in Chrome 103, Firefox 100 and Safari 16, so it stays inside the target of himmel and keeps its place in the advice.

## Goals / Non-Goals

**Goals:**

- A developer on any build target can obey the advice without a `TypeError`.

**Non-Goals:**

- Name versions for the other APIs that the advice uses. `AbortSignal.timeout` and `AbortController` are inside the target of himmel.
- Ship a runtime helper from a lint package. The packages of this repository hold lint rules only.

## Decisions

- **Keep `AbortSignal.any` and name its first versions, with a portable form in the document.** The user chose this form. A consumer on a current target keeps the one-line platform form, and the limit shows where the developer reads the advice. Alternatives: a portable form only, which makes each consumer write a helper also where the platform has one, and the versions only, which leaves a developer on an older target with no recipe.
- **The message points to the document and does not hold the function.** The function takes more lines than a lint message can carry.
- **One copy of the function, in `docs/rules/require-abort-signal.md`.** `docs/rules/use-query-signal.md` links to its section. This obeys the one-copy rule of CONTRIBUTING.md.
- **The function uses `controller.abort(reason)`, `signal.reason` and the `signal` option of `addEventListener`.** These ship in Chrome 98, Firefox 97 and Safari 15.4 at the latest, below the target of himmel. The `signal` option removes each listener when the combined signal aborts.
- **The guard is a helper beside `ruleDocumentProblems` in `rule-documents.ts`.** It reads each message and each document of the rules of a plugin and reports each one that advises `AbortSignal.any` without each version. The documentation tests of the typecheck package and of the React rules call it. A future rule of those plugins that gives the same advice falls under the same check.

## Risks / Trade-offs

- [The listeners stay on the given signals while none aborts] → A query signal and a deadline live for one request, so the listeners go with them. The document states that the function removes its listeners when the combined signal aborts.
- [The test pins version strings] → The versions are fixed facts of released browsers and do not change.
