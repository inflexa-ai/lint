# Tasks

## 1. no-unknown-parameters comment

- [x] 1.1 Remove the stray `^` before ` * ` on the last JSDoc line of `oxlint/typescript/src/rules/no-unknown-parameters.ts`, so the line has the JSDoc form.
- [x] 1.2 Replace the boundary sentence that names `extensions/` and the API client with a sentence that tells the reader to exclude the boundary files of the consumer in the consumer config. Verify with a read of the comment: no path of a consumer repository remains, and the JSDoc block renders as plain comment text.

## 2. store-placement comment

- [x] 2.1 Move the "No default" comment from above `bannedInStores` in `DEFAULTS` to a position where it cannot refer to `bannedInStores`, above `DEFAULTS`. Verify with a read of the constant: each member with a default keeps its value, and the comment sits where it can only describe `factorySource`.

## 3. Verification

- [x] 3.1 Run the test suites of both workspaces (`npm test --workspaces` in `oxlint/`) and confirm the baseline result: typescript 400 passed, react 191 passed.
- [x] 3.2 Run the lint of the workspace (`npm run lint` in `oxlint/`) and confirm no new findings.

## 4. Documentation

- [x] 4.1 Replace the boundary sentence of `docs/rules/no-unknown-parameters.md` ("The API client and `extensions/` sit outside this rule in `oxlint.config.ts`.") with a sentence that tells the reader to exclude the boundary files of the consumer in the consumer config. Verify with a read of the doc: no path of a consumer repository remains.
- [x] 4.2 Run the test suites and the lint again and confirm the result of the first pass: typescript 400 passed, react 191 passed, lint clean.
