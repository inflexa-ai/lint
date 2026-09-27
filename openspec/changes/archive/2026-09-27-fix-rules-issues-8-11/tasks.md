# Tasks

## 1. no-unknown-returns under oxlint (#8)

- [x] 1.1 Add a valid case with no return type to the tests of `no-unknown-returns`, `no-unknown-parameters` and `no-unknown-type-guards`, and see the `no-unknown-returns` case fail with the `typeAnnotation` TypeError
- [x] 1.2 Treat a `null` return type as absent in `no-unknown-returns`, and verify that the rule tests pass

## 2. no-module-mocking and bun:test (#9)

- [x] 2.1 Add the cases of the issue (import, aliased import, global, computed member, own binding) and an aliased `vi` import to the rule tests, and see them fail
- [x] 2.2 Give each framework object its module and methods, match an import by its exported name, and verify that the rule tests pass
- [x] 2.3 Update the message and `docs/rules/no-module-mocking.md`, and verify that the documentation test passes

## 3. explicit-function-return-type in typescript() (#10)

- [x] 3.1 Add a factory test that asserts the rule and its options in the TypeScript block and `off` in the test block, and see it fail
- [x] 3.2 Add the rule to `typescript()`, and verify that the factory test passes
- [x] 3.3 Add the return types that the self-lint asks for, and verify that `npm run lint` passes

## 4. golint analyzers (#11.1, #11.2)

- [x] 4.1 Add `testdata/src/uuid/uuid.go` and a package that uses it to the `typedids` test data, and see the test fail
- [x] 4.2 Accept the standard library `uuid` in `isUUID`, update `docs/rules/typedids.md`, and verify that the `typedids` tests pass
- [x] 4.3 Add the `errors.AsType` init-statement case, a fallback-4xx case after it, and a negative case with a call that is not a guard to the `notfoundguard` test data, and see the test fail
- [x] 4.4 Add `errors.AsType` to the default guards, read the init statement of each `if` condition, update `docs/rules/notfoundguard.md`, and verify that the `notfoundguard` tests pass

## 5. golint base without gocognit (#11.3)

- [x] 5.1 Remove gocognit from `golint/config/golangci.base.yml`, and verify that `go test ./config/...` passes

## 6. Versions

- [x] 6.1 Set `golint/VERSION` and both npm manifests to 0.3.0, move the dependency range of the React package on the TypeScript package, and verify that `npm install` changes only the versions in the lock file

## 7. Checks

- [x] 7.1 Run `npm run typecheck`, `npm test`, `npm run lint` and `npm run format:check` in `oxlint/`, and `go vet ./...` and `go test ./...` in `golint/`, and verify that each passes
