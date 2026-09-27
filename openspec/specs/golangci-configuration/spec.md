# golangci-configuration Specification

## Purpose
One base configuration holds the golangci-lint rules of Inflexa for Go, and a generator writes it into a repository with the local choices of that repository merged in, because golangci-lint v2 reads one file and has no `extends`.

## Requirements

### Requirement: The base configuration holds the tuned linters and their settings

The base configuration of `golint` SHALL be a golangci-lint v2 file with `linters.default: none` that enables exactly these linters: errcheck, govet, ineffassign, staticcheck, unused, errorlint, nilnesserr, noctx, sloglint, forbidigo, containedctx, asasalint, bidichk, durationcheck, fatcontext, loggercheck, makezero, reassign, sqlclosecheck, gosec, testifylint, usetesting, thelper, exhaustive, musttag, unconvert, gocritic, revive, godoclint, nolintlint, misspell, copyloopvar, intrange, modernize, gocognit, depguard, and the eleven plugins. It SHALL set: govet `enable-all` without `fieldalignment` and `shadow`, errcheck without `check-blank`, sloglint `context: scope`, `key-naming-case: snake` and `forbidden-keys: [err]`, forbidigo `analyze-types: true` with patterns for `context.Background`, `context.TODO`, `http.Get`, `http.Post`, `http.PostForm`, `http.Head`, `http.DefaultClient`, `time.Sleep` and `http.Error`, gosec without G101, G104 and G404, exhaustive `default-signifies-exhaustive: true`, gocognit `min-complexity: 30`, nolintlint `require-explanation`, `require-specific` and `allow-unused: false`, revive with the default rules without `exported`, `package-comments` and `unused-parameter` plus `datarace`, `defer`, `identical-branches`, `identical-ifelseif-conditions`, `identical-switch-conditions`, `unconditional-recursion`, `waitgroup-by-value` and `range-val-address`, the exclusion paths `^docs/` and `(^|/)internal/repo/`, exclusion rules that skip noctx, gosec and forbidigo in test files, gosec in `testutil/` and `kernel/ids/gen/`, and forbidigo and gocognit in `cmd/`, `testutil/` and `kernel/ids/gen/`, the formatters gofmt and goimports with the module path as local prefix, `run.relative-path-mode: gomod`, `exclusions.generated: strict`, `issues.uniq-by-line: false`, `issues.max-issues-per-linter: 0` and `issues.max-same-issues: 0`.

#### Scenario: A linter of the tuned set runs

- **WHEN** the generated configuration lints a file that holds `slog.Error("x", "err", err)` in a function with a `ctx` parameter
- **THEN** sloglint reports the missing context and the key `err`

#### Scenario: A discarded error is the job of blankerr

- **WHEN** the generated configuration lints `_ = f()` with no `SAFETY:` comment
- **THEN** `blankerr` reports the line and errcheck does not

### Requirement: The base configuration holds the architecture layers and the ruleguard patterns

The base configuration SHALL hold depguard rules, with `list-mode: lax`, that deny: the packages `modules`, `provider`, `handler`, `middleware`, `config` and `testutil` of the module in `kernel/`; `modules` of the module in `testutil/`, `handler/response/` and `handler/request/`; `kernel/pgerr` of the module and `github.com/riverqueue/river` in `handler/`; `handler` of the module in `middleware/`; `handler` of the module in the test files of `modules/`; `handler/v1/types` of the module in `handler/unversioned/`; `golang.org/x/sync/errgroup` outside `kernel/conc/`; `github.com/testcontainers/testcontainers-go` outside `testutil/`; `github.com/golang/mock`, `go.uber.org/mock`, `github.com/vektra/mockery` and `github.com/stretchr/testify/mock` in each file. It SHALL enable the `ruleguard` check of gocritic beside the default checks, with `failOn: dsl,import` and the rules file that the generator writes. The rules file SHALL hold `//go:build ruleguard` before its package clause and SHALL hold one rule for each pattern: `pgconv.ToUUID(uuid.UUID($x))` and `pgconv.ToUUID($x.ToUnderlying())`, `uuid.Parse($r.PathValue($_))`, a `kernel/conc` constructor with the bound `0`, `decimal.NewFromFloat($x + $y)`, and a `TRUNCATE` string literal in a test file as an argument of a call (positions 1 to 3), in an assignment, in a `var` or `const` declaration, or in a `return`.

#### Scenario: A layer breaks

- **WHEN** the generated configuration lints a file under `kernel/` that imports `<module>/modules/iam/policy`
- **THEN** depguard reports the import

#### Scenario: A ruleguard pattern matches

- **WHEN** the generated configuration lints `conc.ParallelMap(ctx, items, 0, fn)` in a module that requires `github.com/quasilyte/go-ruleguard/dsl`
- **THEN** gocritic reports the constant bound `0`

#### Scenario: The rules file survives tidy and build

- **WHEN** a repository holds the generated `golangci/rules.go` and runs `go mod tidy`, `go build ./...` and `go vet ./...`
- **THEN** the `dsl` requirement stays in `go.mod`, no build or vet reads the rules file, and `go list -e -f '{{.IgnoredGoFiles}}' ./golangci` prints `[rules.go]`

### Requirement: The base configuration scopes and configures each plugin

The base configuration SHALL hold one `linters.settings.custom.<name>` entry of `type: module` for each plugin, and SHALL give each fact of the shared service layout as a setting with the module path filled in: `typedids` `ids-package: <module>/kernel/ids`; `notfoundguard` `guards: [<module>/kernel/pgerr.IsNotFound]`; `boundedfanout` `allowed-packages: [<module>/kernel/conc]`; `detachedctx` `hook-methods: [AfterCommit, OnRollback]` and `exempt-packages: [log/slog, go.opentelemetry.io/otel]`; `rawhttp` `body-packages: [<module>/handler/request]`; `swagsync` `register-methods: [HandleGET, HandlePOST, HandlePUT, HandlePATCH, HandleDELETE]`. It SHALL hold no fact of one consumer repository: no `keyowner` key, no `rawhttp` client package, and no exclusion path that names a directory below `cmd/`. A repository adds those facts in its overlay. It SHALL limit, with exclusion rules: `notfoundguard` and `swagsync` to `handler/`; `testplacement` to `modules/`; `boundedfanout`, `rawhttp`, `swagsync` and `anyapi` to files that are not tests; `boundedfanout` to paths outside `cmd/`; `anyapi` to paths outside `kernel/types/`; `containedctx` to paths outside `kernel/conc/`; the `http.Error` pattern of forbidigo to paths outside `handler/response/`; the `PathValue` rule of ruleguard to `handler/`.

#### Scenario: A test file beside the code in kernel

- **WHEN** the generated configuration lints `kernel/conc/conc_test.go` and `modules/iam/drive_credentials_test.go`
- **THEN** `testplacement` reports the second file only

#### Scenario: The base holds no fact of one repository

- **WHEN** `inflexa-lint-config` renders the base for a module with no overlay
- **THEN** the `keyowner` entry holds no `keys`, the `rawhttp` entry holds no `client-packages`, and no exclusion path names a directory below `cmd/`

#### Scenario: An overlay adds a fact of the repository

- **WHEN** `golangci/overlay.yml` holds `linters: {settings: {custom: {rawhttp: {settings: {client-packages: [example.com/fixture/provider/httpc]}}}}}`
- **THEN** the generated `rawhttp` entry holds `client-packages: [example.com/fixture/provider/httpc]` beside the `body-packages` of the base

### Requirement: The generator writes the configuration into a repository

`golint/cmd/inflexa-lint-config` SHALL read the module path from the `go.mod` of the target directory (the flag `-dir`, default the working directory), SHALL render the embedded base with the module path in place of each `{{module}}`, SHALL load the package of the `typedids` setting `ids-package` from the target directory and write the names of its types with underlying `[16]byte` into the `typedids` setting `names` (an error when the package does not load), SHALL merge `<dir>/golangci/overlay.yml` when it exists (a mapping merges by key, a sequence of the overlay appends after the sequence of the base, a scalar of the overlay replaces), and SHALL write `<dir>/.golangci.yml` and `<dir>/golangci/rules.go`. Each written file SHALL start with a comment that names the generator. With the flag `-check` it SHALL write nothing, SHALL print the path of each file that differs from the rendered content or is absent, and SHALL exit with status 1 when it printed a path and 0 otherwise. It SHALL exit with status 2 and a message when the target directory has no `go.mod`.

#### Scenario: A first run

- **WHEN** a developer runs `inflexa-lint-config -dir <repo>` in a repository with `module example.com/svc` and no overlay
- **THEN** `<repo>/.golangci.yml` holds `example.com/svc/kernel/ids` and the `names` of that package under `typedids`, `<repo>/golangci/rules.go` holds the ruleguard rules, and both start with the generator comment

#### Scenario: An overlay adds a local choice

- **WHEN** `<repo>/golangci/overlay.yml` holds `issues: {new-from-merge-base: main}` and `linters: {exclusions: {rules: [{path: ^scripts/, linters: [gosec]}]}}`
- **THEN** the generated file holds `new-from-merge-base: main`, and the exclusion rule of the overlay after each exclusion rule of the base

#### Scenario: Drift in CI

- **WHEN** a person edits the generated `.golangci.yml`, and CI runs `inflexa-lint-config -check`
- **THEN** the command prints `.golangci.yml`, changes no file, and exits with status 1

### Requirement: The generated configuration loads and runs in inflexa-lint

The generated configuration SHALL load in `inflexa-lint` without an error: each linter name exists, each setting key is known, and each plugin decodes its settings. A test of the module SHALL build `cmd/inflexa-lint` one time and prove it with `inflexa-lint linters -c <generated file>` in a fixture module. A second test SHALL run `inflexa-lint run` with the generated configuration on that fixture module, which requires `github.com/quasilyte/go-ruleguard/dsl`, and SHALL assert one report each from sloglint, depguard, gocritic ruleguard and a plugin, and that `//nolint:<name> // reason` on a line that two plugins report removes the report of the plugin `<name>` only.

#### Scenario: The linters command accepts the file

- **WHEN** the test renders the base for the fixture module and runs `inflexa-lint linters -c <file>` in it
- **THEN** the command exits with status 0 and lists each of the eleven plugin names

#### Scenario: The run on the fixture

- **WHEN** the test runs `inflexa-lint run -c <file> ./...` in the fixture module
- **THEN** the output holds a sloglint issue, a depguard issue, a gocritic ruleguard issue and an `errtext` issue, and the line that `errtext` and `notfoundguard` both report and that carries `//nolint:errtext // the module exports no sentinel yet` has a `notfoundguard` issue and no `errtext` issue

#### Scenario: The version of the built binary

- **WHEN** the test runs the built binary with `version`
- **THEN** the output contains `+golint.(devel)`
