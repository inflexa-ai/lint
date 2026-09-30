# Tasks

## 1. Documentation

- [x] 1.1 Add the known-issue note to the Install section of `oxlint/react/README.md`, after the paragraph about the optional peers. Use this text, which obeys the repository word rules:

  ```markdown
  On TypeScript 6.1 or later, `npm ls` exits 1 with an invalid peer. The cause is the peer range `>=4.8.4 <6.1.0` for `typescript` in `@typescript-eslint/utils` 8.71.0, which `@tanstack/eslint-plugin-query` installs. The rules still load and report, so a lint run works. No `overrides` entry repairs a peer, because npm applies overrides to dependency versions only.

  `legacy-peer-deps=true` in `.npmrc` silences the peer warnings of the install. It does not repair the peer, and `npm ls` still exits 1. The repair comes when typescript-eslint widens the range. A project takes the repaired version in the next update of its dependencies, with no change of this package.
  ```

  Verify the note against the facts in the design.

## 2. Test

- [x] 2.1 Add a test to `oxlint/react/src/test/dependencies.test.ts` that reads the Install section of `oxlint/react/README.md` and asserts that the note names `@typescript-eslint/utils`, `@tanstack/eslint-plugin-query`, the release 8.71.0, the exit of `npm ls`, the statement about `legacy-peer-deps=true`, and the repair through typescript-eslint. Verify with `npm test --workspace @inflexa-ai/oxlint-plugin-react`.

## 3. Validation

- [x] 3.1 Run `npm run lint` at `oxlint/` and make sure that it passes. Run `npx oxfmt --check` on `react/README.md` and `react/src/test/dependencies.test.ts` at `oxlint/` and make sure that they pass. The workspace-wide `format:check` is out of scope for this change, because the working tree carries an unformatted file of the change `guard-typecheck-disable-directive`, which this change must not touch.
- [x] 3.2 Run the test suite of the React workspace one more time and make sure that every test passes, including the new one.
