# Proposal

## Why

Two rules of `oxlint/typescript` kept private copies of `variableFor`, which `oxlint/typescript/src/helpers/static-names.ts` exports, and `no-module-mocking` repeated the body of `isGlobalIdentifier` inline. The documentation test was copied in each package. A copy can become different from the helper that it repeats, and nothing in the lint run found the copies. The repository keeps one copy of each operation in a shared helper, and a check in `npm run lint` keeps it so.

## What Changes

- `no-module-mocking` and `export-at-declaration` import `variableFor` from the shared helper, and `no-module-mocking` calls `isGlobalIdentifier`. The rules keep the same behavior.
- `oxlint/typescript/src/rules/test/rule-documents.ts` gives `ruleDocumentProblems`, and the documentation test of each package asserts through it.
- `jscpd` 5.3.3 becomes a pinned dev dependency of the workspace. `oxlint/.jscpd.json` scans the TypeScript and JavaScript files of the workspace, and `npm run lint:jscpd` runs it as the last step of `npm run lint`. The scan takes about 0.03 s on the workspace.
- `CONTRIBUTING.md` and `oxlint/README.md` tell a contributor to keep one copy of each operation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `self-linting`: `npm run lint` also runs jscpd, and the workspace holds one copy of each operation.

## Impact

- Code: `oxlint/typescript/src/rules/no-module-mocking.ts`, `oxlint/typescript/src/rules/export-at-declaration.ts`, the documentation test of each package, and the new test helper.
- Tooling: `oxlint/package.json`, `oxlint/package-lock.json` and `oxlint/.jscpd.json`. CI runs `npm run lint`, so the pull request check runs jscpd with no change to the workflow.
- Consumers: none. No published file changes.
