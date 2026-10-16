# Design

## Context

See proposal.md - Why. The facts below come from the code and from probes in `tmp/claude/` with the workspace oxlint 1.85.0 and oxlint-tsgolint 7.0.2003, and with typescript-eslint 8.64.0 from the harness.

- `react()` sets `settings['react-doctor']` to `{ capabilities: ['react-compiler'] }` (`oxlint/react/src/index.ts:152`). oxlint reads `settings` from the root configuration only (`index.ts:164`). The rules of React Doctor come from the `recommended` and `tanstack-query` configs of `eslint-plugin-react-doctor` (`index.ts:33-41`). Both configs also carry `settings: { 'react-doctor': { portedRuleMode: 'curated' } }`, which `react()` drops.
- In eslint-plugin-react-doctor 0.9.14, a rule with `disabledWhen` stays off when one listed capability is in the setting, by exact string. A rule with `requires` runs whether the capability is present or not: `no-react19-deprecated-apis` reports `createFactory` with `capabilities: ['react-compiler']`. The gates that read a React version are `no-chain-state-updates` (`disabledWhen: ['react:18']`) and `no-ref-callback-cleanup-before-react-19` (`disabledWhen: ['react:19']`). The oxlint RuleTester with `settings` runs these gates: the second rule reports a ref callback cleanup with `react:18` only, and reports nothing with `react:19`.
- The CLI of React Doctor (`packages/core/src/project-info/capabilities.ts` in millionco/react-doctor) emits `react:17` up to `react:<major>`, and `react:19.2` from React 19.2. Thus `react:<n>` means "React `<n>` or later".
- `require-assertion-safety` walks from the assertion to the parents. At each node it looks for a `SAFETY:` comment directly before that node, and it stops at a node in `STATEMENTS` or at a child of `Program` (`require-assertion-safety.ts:6`, `:50-55`). `STATEMENTS` holds no compound statement. Probes: a comment above a braceless `if` or `for...of` body, an `else if` branch, or `export const` does not count. A comment above a function counts for a cast in an `if` test in that function, because the walk passes the `if`, the block and the function.
- #38 to #41 and #43 have no code in this repository. The preset sets the level of each rule (`oxlint/typescript/src/presets.ts:72`, `:83`, `:100`, `:118`).

## Goals / Non-Goals

**Goals:**

- React Doctor gets the same React version capabilities that its CLI gives for the same version.
- One placement rule for a `SAFETY:` comment, which the code, the message and the document state in the same words.
- A developer who meets one of the upstream reports finds the cause and a workaround in the README.

**Non-Goals:**

- Detect the React version from the `react` dependency of the project. The factory is synchronous and static, the root `package.json` of a workspace often has no `react` dependency (himmel), and the README of eslint-plugin-react-doctor tells a static config to declare each capability.
- Give React Doctor capabilities beside the React version and the compiler, for example `tanstack-query` or `tailwind:4`. No gate of the oxlint path reads them.
- Write `settings.react.version` for the native `react` plugin of oxlint. No rule that `react()` turns on reads it.
- Fix or port an upstream rule. The user selected the documented workaround for #38 to #41 and #43.

## Decisions

- **`reactVersion` is required inside `reactDoctor`.** A React Doctor run without the version gets the rules of the wrong React version, and a static configuration has no other source of the version. The version belongs to the option of the tool that reads it, thus it sits in `reactDoctor` and not at the top of `react()`. Alternative: an optional top-level `version`, as `solid()` has. A missing value would then leave the defect of #37 silent. `reactDoctor: true` goes away because it cannot carry the version, and no consumer uses it (himmel uses `{ files }`).
- **The version is a string of decimal parts.** `'19'`, `'19.3'` and `'19.3.0'` are valid. The factory reads the major and the minor, and the minor defaults to 0. A valid value matches the pattern that oxlint 1.85.0 gives `settings.react.version` in its configuration schema, `^[1-9]\d*(\.(0|[1-9]\d*))?(\.(0|[1-9]\d*))?$`. A range such as `^19.3.0` is not a version, thus the factory throws an `Error` whose message names `reactDoctor.reactVersion` and the value. The own configuration of the workspace turns off the regular expression ban (`oxlint/oxlint.config.ts:6`), thus the factory can use that pattern.
- **The capability ladder copies the CLI of React Doctor.** It starts at `react:17`, as the CLI does, and ends at the major of the version. A major below 17 gives no version capability, as in the CLI, and is not an error. The ladder ends at `react:30` at most, as the CLI clamps it at its `LATEST_KNOWN_REACT_MAJOR` of 30. The clamp bounds the loop for a value such as `'999999999'`, and a real React 31 still gets each gate that the plugin knows. Alternative: throw above a ceiling. That breaks a repository on a React major that is newer than the ceiling. `react:19.2` comes after the ladder when the major is above 19, or is 19 with a minor of 2 or more. `react-compiler` stays first. Order: `['react-compiler', 'react:17', ..., 'react:<major>', 'react:19.2']`.
- **The React Doctor settings come from the configs whose rules `react()` copies.** `react()` merges the `react-doctor` object of the `settings` of the `recommended` and `tanstack-query` configs, then sets `capabilities`. Thus a setting that a later release of the plugin adds to those configs reaches the root as the rules do. Alternative: write `portedRuleMode: 'curated'` in this package. That copy can drift from the plugin. The plugin loads once for the rules and the settings.
- **The holding statement ends the walk.** The walk checks the comments before each node, and stops after the node whose parent is `Program`, `BlockStatement`, `StaticBlock`, `SwitchCase`, `TSModuleBlock` or `ClassBody`. `STATEMENTS` goes away. A braceless body is the child of its `if` or loop, thus the walk goes on to the `if` or the loop, and an `else if` reaches the first `if`. A cast in an `if` test stops at the `if`, which the block holds, thus a comment above the enclosing function no longer answers for it. The user approved this rule: the walk stops at the statement that the block or the program holds.
- **The new message text:** "This `as` tells the compiler to stop checking, and nothing here says why that is sound. State the invariant in a `SAFETY:` comment above the statement that holds the `as`, or before the `as` on its line: the check that narrows the value, the contract that guarantees its shape, or the reason the runtime built it. A statement in a body without braces belongs to its `if` or loop. If the value comes from outside the program, parse it with a zod schema instead."
- **The upstream limits go in one README section.** `oxlint/README.md` gets the section "Limits of the upstream rules", before "Release the npm packages". `docs/rules/` holds the documents of the rules of this repository only (`lint-rule-documentation`), thus an upstream rule gets no document there. Each entry gives the rule, the observed versions, the comparison with typescript-eslint 8.64.0, and the workaround. These workarounds passed a probe before this change:
  - `no-unnecessary-type-assertion`: `const init: (RequestInit & { timeout?: unknown }) | undefined = inits[0]` in place of the cast.
  - `no-deprecated`: `'text' in part` narrows to the member that the code reads.
  - `no-invalid-void-type`: `okAsync()` and `ok()` with no argument. neverthrow 8.2.0 has an overload that returns `ResultAsync<void, E>` or `Ok<void, E>`. A binding that needs the error type keeps `void` in its annotation, `const okVoid: ResultAsync<void, PluginError> = okAsync()`. A type reference with `void` stays allowed.
  - `only-throw-error`: `return await failStep(err)` for a `Promise<never>`, and `['error', { allow: [{ from: 'file', name: 'ProviderError' }] }]` in a block of the repository for a declared error type. The preset sets no options on this rule, thus the block replaces nothing.
  - JSON output: `span.offset` and `span.column` count UTF-8 bytes, and `span.line` counts lines from 1.

## Risks / Trade-offs

- [`reactDoctor: true` and a missing `reactVersion` stop the type check of a consumer] → The packages are at 0.x, the only consumer is himmel, and the error tells the fix. The README example shows the new form.
- [The tighter walk adds reports where a comment above a function answered for a cast in an `if` test or a loop head] → The comment then moves to the statement that holds the cast, which is the placement that the message states. The proposal names this effect.
- [A later release of oxlint or tsgolint changes a documented behavior] → Each entry names the versions where a probe saw it. A version bump of the workspace is the moment to probe again.
- [A later React Doctor release adds a gate on a capability that `react()` does not emit] → The capability list copies only the React version and the compiler. The design names this limit.
