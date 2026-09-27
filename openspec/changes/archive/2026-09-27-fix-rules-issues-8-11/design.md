# Design

## Context

See proposal.md for the issues. The TypeScript rules that read only syntax run under oxlint, whose AST gives `null` for an absent optional node where typescript-estree gives `undefined`. The rule tests already run in the RuleTester of oxlint (`oxlint/typescript/src/rules/test/rule-tester.ts`), but no case of `no-unknown-returns` had a function with no return type.

## Goals / Non-Goals

**Goals:** fix the four issues with the smallest change to each rule, and keep the self-lint of the oxlint workspace green.

**Non-Goals:** a `uuid-packages` setting for `typedids`; a guard that a statement before the `if` assigns (`ok := errors.Is(...); if ok`).

## Decisions

### no-unknown-returns: a falsy check for the absent return type

`if (!annotation) return` covers `null` and `undefined`. A review of the other optional-node reads found no second defect: `no-unknown-type-guards` reads `returnType?.typeAnnotation` before its `=== undefined` test, thus a `null` return type stops at the predicate check. `unwrapTransparent` compares `TSTypeOperator.typeAnnotation` with `undefined`, but the operator node of oxc always carries its operand. A valid case with no return type goes into the tests of `no-unknown-returns`, `no-unknown-parameters` and `no-unknown-type-guards`, which each visit every function.

### no-module-mocking: the framework map keys on the exported name

`FRAMEWORKS` maps each framework object to its module and its mock methods: `vi` → `vitest`, `jest` → `@jest/globals`, both with `mock`, `doMock`, `unstable_mockModule`; `mock` → `bun:test` with `module`. An identifier with no definition is the framework object when its own name is a key. An identifier bound by an import is the framework object when the import comes from the module of the exported name, whatever the local name. This recognizes `import { mock as m } from 'bun:test'`, and for the same reason `import { vi as v } from 'vitest'`, which the rule missed before. Alternative: alias support for `bun:test` only. Rejected, because the rule then treats the same import shape two ways.

The message drops "hoists above the imports", because `mock.module` of `bun:test` does not hoist. The document keeps the hoisting for `vi.mock` and `jest.mock`.

### explicit-function-return-type: in the TypeScript block, off for the tests

The rule goes into the `**/*.{ts,tsx}` block with the two options of the issue. The test block of the factory sets it to `off`, because a test helper has its callers in the same file and a typed tester already checks its result. The user chose this scope. `react()` spreads the blocks of `typescript()`, thus it gets the rule with no change.

### typedids: a fixed set of UUID packages

`isUUID` accepts `github.com/google/uuid` and `uuid`. Alternative: a `uuid-packages` setting. Rejected: no third UUID package is known, and a setting adds a knob that no consumer asked for. The test data adds `testdata/src/uuid/uuid.go`. With Go 1.27 the standard library package wins over the test data, and with the Go 1.26 of CI the test data stands in for it; the analyzer sees the path `uuid` in both cases.

### notfoundguard: the init statement travels with its condition

`cond` records the init statement of its `if`. When `guarded` checks a condition, the leaf test accepts a guard call, or an identifier whose object is a boolean left-hand side of an init assignment whose single right-hand side is a guard call on the tested error. The same identifier test applies in `hasGuardBranch`, thus an `if _, ok := errors.AsType[...](err); ok` branch also counts as a guard branch for the fallback 4xx report. `typeutil.StaticCallee` resolves the instantiated `errors.AsType[*E]` to the generic function `errors.AsType`, thus the name in the guard set is enough.

### golangci base: remove gocognit

Remove it from `linters.enable`, the settings, and the `cmd/` exclusion. The dependency stays in `go.sum` as a part of golangci-lint.

## Risks / Trade-offs

- [A consumer that relied on gocognit loses it] → The consumer adds it in its overlay; the proposal marks the removal as breaking.
- [explicit-function-return-type reports in each consumer] → The allow options keep callbacks and typed function expressions quiet; the issue measured 9 reports on `bench`.
