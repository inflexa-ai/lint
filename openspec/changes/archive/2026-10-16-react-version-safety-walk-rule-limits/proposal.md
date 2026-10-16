# Proposal

## Why

The move of the harness (inflexa-ai/inflexa) and of himmel to oxlint found defects in this repository and limits of the upstream rules that its presets turn on (#37 to #43). `react()` gives React Doctor no React version, thus a React 19 project gets the rules for React 18 (#37). The SAFETY comment walk of `require-assertion-safety` stops at the first statement node, thus a comment above a braceless `if` body does not count (#42). The other reports come from oxlint and tsgolint, where this repository has no code, thus each needs a documented workaround (#38 to #41, #43).

## What Changes

- **BREAKING** `react()`: the `reactDoctor` option becomes `{ reactVersion: string; files?: string[] }`. `reactVersion` is required. The form `reactDoctor: true` goes away, and `files` defaults to each TypeScript file, which `true` meant. The only known consumer, himmel, passes `{ files }` and adds `reactVersion`.
- `react()` gives React Doctor the version capabilities that its CLI emits for the same version: `react:17` up to `react:<major>`, and `react:19.2` from React 19.2. It keeps `react-compiler`. (#37)
- `react()` keeps the React Doctor settings of the flat configs whose rules it copies. Today it drops `portedRuleMode: 'curated'`, thus React Doctor runs ported rules outside its curated set, for example `button-has-type`. himmel has a workaround for this in its `oxlint.config.ts`. This defect is next to #37 and is not in the issue.
- `require-assertion-safety`: the walk from an assertion goes up to the statement that a block or the program holds, and a `SAFETY:` comment before any node on that path counts. A comment above a braceless `if` or loop body, an `else if` branch, or an `export const` then counts. A comment above an enclosing function no longer counts for a cast in an `if` test or a loop head, because the walk now stops at the `if` or the loop. The message and the rule document state the placement. (#42)
- `oxlint/README.md` gets a section on the limits of the upstream rules: the reports of `no-unnecessary-type-assertion` (#38), `no-deprecated` (#39), `no-invalid-void-type` (#40) and `only-throw-error` (#41), and the byte unit of `span.offset` and `span.column` in the JSON output of oxlint (#43). Each entry names the observed versions and a workaround that a probe confirms. The rules stay on. The user selected this approach.

## Capabilities

### New Capabilities

- `assertion-safety`: where a `SAFETY:` comment answers for a type assertion under `require-assertion-safety`.

### Modified Capabilities

- `oxlint-configuration`: adds the React version capabilities and the curated rule mode of React Doctor in `react()`, and the documented limits of the upstream rules that the presets turn on.

## Impact

- Code: `oxlint/react/src/index.ts` (the `reactDoctor` option and the React Doctor settings), `oxlint/typescript/src/rules/require-assertion-safety.ts` (the walk and the message).
- Tests: `oxlint/react/src/test/presets.test.ts`, which also runs the React Doctor version gates through the rule tester, and `oxlint/typescript/src/rules/test/assertion-safety.test.ts`.
- Documents: `oxlint/README.md` (the `reactDoctor` example and the new section on upstream limits), `docs/rules/require-assertion-safety.md`.
- Consumers: himmel adds `reactVersion` to its `reactDoctor` option, and can remove its `portedRuleMode` workaround. A repository can see new `require-assertion-safety` reports where a comment above an enclosing function answered for a cast in an `if` test or a loop head.
- No dependency changes.
