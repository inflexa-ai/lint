# Proposal

## Why

Four open issues report defects and gaps in the shared rules: a crash of `no-unknown-returns` under oxlint (#8), no report for `mock.module` of `bun:test` (#9), no rule that asks for declared return types (#10), and wrong results of two Go analyzers plus an unwanted linter in the golint base (#11). Consumers (the `bench` and `nexus` repositories) meet each one today.

## What Changes

- `no-unknown-returns` treats a missing return type as absent when the parser gives `null` (oxlint) as well as `undefined` (typescript-eslint). The JS plugin no longer stops on a function with no return type. (#8)
- `no-module-mocking` reports `module` on the `mock` object of `bun:test`: the global of `bun test`, and a named import from `bun:test` under any local name. Each framework object carries its own mock methods. A named import of `vi` or `jest` under a local alias is also recognized. (#9)
- The `typescript()` factory turns on `typescript/explicit-function-return-type` with `allowExpressions: true` and `allowTypedFunctionExpressions: true` for each TypeScript file, and turns it off for the `tests` globs. The workspace adds the return types that its own lint then asks for. (#10)
- `typedids` accepts `uuid.UUID` of the standard library package `uuid` beside `github.com/google/uuid`. (#11.1)
- `notfoundguard` knows `errors.AsType` as a default guard, and reads a guard that the init statement of an `if` assigns to a boolean identifier that its condition tests. (#11.2)
- **BREAKING** The golint base configuration no longer enables `gocognit`, and drops its settings and its `cmd/` exclusion. (#11.3)
- The golint module and both npm packages move to version 0.3.0, thus the merge into `main` releases them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `go-analyzers`: `typedids` accepts the standard library `uuid`; `notfoundguard` knows `errors.AsType` and the init-statement guard.
- `golangci-configuration`: the base enables no `gocognit`.
- `oxlint-configuration`: the factory asks for a declared return type outside of the test files.

## Impact

- Code: `oxlint/typescript/src/rules/no-unknown-returns.ts`, `no-module-mocking.ts`, `oxlint/typescript/src/index.ts`, two source functions of the workspace that lack a return type, `golint/typedids`, `golint/notfoundguard`, `golint/config/golangci.base.yml`.
- Tests: the rule tests of the changed TypeScript rules, the factory test, and the `analysistest` data of `typedids` and `notfoundguard`.
- Documents: `docs/rules/no-module-mocking.md`, `typedids.md`, `notfoundguard.md`.
- Consumers: a TypeScript repository gets reports for functions with no declared return type. A Go repository that relied on `gocognit` from the base adds it in its overlay.
