# Tasks

## 1. Shared helper

- [x] 1.1 Move the `unwrap` function of `no-conditional-spread.ts` and `no-unbounded-promise-all.ts` to `oxlint/typescript/src/helpers/`, and import it in both rules. Verify with `npm run typecheck -w typescript` at `oxlint/`.

## 2. The rule

- [x] 2.1 Write `oxlint/react/src/rules/class-constant-name.ts` as the spec `class-constant-name` and design.md state, and add it to `oxlint/react/src/plugin.ts`.
- [x] 2.2 Write `oxlint/react/src/rules/test/class-constant-name.test.ts` with the scenarios of the spec. Verify that the test passes.
- [x] 2.3 Write `docs/rules/class-constant-name.md`. Verify that the documentation test of the React package passes.

## 3. The preset

- [x] 3.1 In `oxlint/react/src/index.ts`, set `selectors` in `settings['better-tailwindcss']` and turn on `class-constant-name` in the Tailwind block, as the spec `plugin-dependencies` states.
- [x] 3.2 In `oxlint/react/src/test/tailwind.test.ts`, assert the settings and the rules, run `enforce-canonical-classes` and `no-restricted-classes` with the settings of `react()` on a `_CLASSES` string, a `_CLASSES` object and a default name, and compare the callee names of the rule with `getDefaultSelectors()`. Verify that the test passes.
- [x] 3.3 In `oxlint/README.md`, state the `_CLASSES` convention in the Tailwind paragraph.

## 4. Release

- [x] 4.1 Bump the shared packages to 0.10.0, as commit `ec3ae62` did, and update `oxlint/package-lock.json`.
- [x] 4.2 At `oxlint/`, run `npm run typecheck`, `npm run lint` and `npm run format:check`, then run `npm test` one time.
