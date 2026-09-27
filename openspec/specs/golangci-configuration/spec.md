# golangci-configuration Specification

## Purpose
One base configuration holds the golangci-lint rules of Inflexa for Go, and a generator writes it into a repository with the local choices of that repository merged in, because golangci-lint v2 reads one file and has no `extends`.

## Requirements

### Requirement: The base configuration holds the tuned linters and their settings

The base configuration of `golint` SHALL be a golangci-lint v2 file with `linters.default: none` that enables exactly these linters: errcheck, govet, ineffassign, staticcheck, unused, errorlint, nilnesserr, noctx, sloglint, forbidigo, containedctx, asasalint, bidichk, durationcheck, fatcontext, loggercheck, makezero, reassign, sqlclosecheck, gosec, testifylint, usetesting, thelper, exhaustive, musttag, unconvert, gocritic, revive, godoclint, nolintlint, misspell, copyloopvar, intrange, modernize, depguard, and the plugins that need no fact of a repository: errtext, notfoundguard, blankerr, boundedfanout, detachedctx, anyapi and swagsync. It SHALL set: govet `enable-all` without `fieldalignment` and `shadow`, errcheck without `check-blank`, sloglint `context: scope`, `key-naming-case: snake` and `forbidden-keys: [err]`, forbidigo `analyze-types: true` with patterns for `context.Background`, `context.TODO`, `http.Get`, `http.Post`, `http.PostForm`, `http.Head`, `http.DefaultClient`, and `time.Sleep`, gosec without G101, G104 and G404, exhaustive `default-signifies-exhaustive: true`, nolintlint `require-explanation`, `require-specific` and `allow-unused: false`, revive with the default rules without `exported`, `package-comments` and `unused-parameter` plus `datarace`, `defer`, `identical-branches`, `identical-ifelseif-conditions`, `identical-switch-conditions`, `unconditional-recursion`, `waitgroup-by-value` and `range-val-address`, exclusion rules that skip noctx, gosec and forbidigo in test files, and forbidigo and boundedfanout in `cmd/`, the formatters gofmt and goimports with the module path as local prefix, `run.relative-path-mode: gomod`, `exclusions.generated: strict`, `issues.uniq-by-line: false`, `issues.max-issues-per-linter: 0` and `issues.max-same-issues: 0`.

#### Scenario: A linter of the tuned set runs

- **WHEN** the generated configuration lints a file that holds `slog.Error("x", "err", err)` in a function with a `ctx` parameter
- **THEN** sloglint reports the missing context and the key `err`

#### Scenario: A discarded error is the job of blankerr

- **WHEN** the generated configuration lints `_ = f()` with no `SAFETY:` comment
- **THEN** `blankerr` reports the line and errcheck does not

#### Scenario: The base enables no cognitive complexity limit

- **WHEN** the generated configuration lints a function whose cognitive complexity is above 30
- **THEN** no linter of the base reports the complexity of that function

### Requirement: The base configuration holds the generic dependency rule and ruleguard patterns

The base configuration SHALL hold one depguard rule, with `list-mode: lax`, that denies `github.com/golang/mock`, `go.uber.org/mock`, `github.com/vektra/mockery` and `github.com/stretchr/testify/mock` in each file. It SHALL enable the `ruleguard` check of gocritic beside the default checks, with `failOn: dsl,import` and the rules file that the generator writes. The rules file SHALL hold `//go:build ruleguard` before its package clause and SHALL hold the rule for `decimal.NewFromFloat($x + $y)`. The layer rules of a repository, and its own ruleguard patterns in a second rules file, belong to its overlay.

#### Scenario: A generated mock

- **WHEN** the generated configuration lints a file that imports `go.uber.org/mock/gomock`
- **THEN** depguard reports the import

#### Scenario: The rules files survive tidy and build

- **WHEN** a repository holds the generated `golangci/rules.go` and a second rules file of its own, and runs `go mod tidy`, `go build ./...` and `go vet ./...`
- **THEN** the `dsl` requirement stays in `go.mod`, no build or vet reads a rules file, and `go list -e -f '{{.IgnoredGoFiles}}' ./golangci` lists both files

### Requirement: The base configuration declares each plugin and holds no fact of one repository

The base configuration SHALL hold one `linters.settings.custom.<name>` entry of `type: module` for each plugin, and SHALL give a plugin no setting that names a package or a folder of a repository. The only plugin setting of the base SHALL be `detachedctx` `exempt-packages: [log/slog, go.opentelemetry.io/otel]`. The base SHALL NOT enable `typedids`, `keyowner`, `rawhttp` or `testplacement`, because each one needs the facts of a repository; an overlay enables each one with its settings. The exclusion rules of the base SHALL skip `boundedfanout`, `rawhttp`, `swagsync` and `anyapi` in test files, and SHALL name no path other than `_test\.go` and `^cmd/`.

#### Scenario: The base renders for any module

- **WHEN** `inflexa-lint-config` renders the base for a module that has none of the folders of another repository, with no overlay
- **THEN** the render succeeds, no setting names a package of the module, and no exclusion path other than `_test\.go` and `^cmd/` exists

#### Scenario: An overlay turns on a plugin with its facts

- **WHEN** `golangci/overlay.yml` holds `linters: {enable: [testplacement]}` and an exclusion rule `{path-except: ^modules/, linters: [testplacement]}`
- **THEN** `testplacement` reports `modules/iam/drive_credentials_test.go` and not `kernel/conc/conc_test.go`

#### Scenario: An overlay adds a fact of the repository

- **WHEN** `golangci/overlay.yml` holds `linters: {settings: {custom: {rawhttp: {settings: {client-packages: [example.com/fixture/provider/httpc]}}}}}`
- **THEN** the generated `rawhttp` entry holds `client-packages: [example.com/fixture/provider/httpc]`

### Requirement: The generator writes the configuration into a repository

`golint/cmd/inflexa-lint-config` SHALL read the module path from the `go.mod` of the target directory (the flag `-dir`, default the working directory), SHALL render the embedded base with the module path in place of each `{{module}}`, SHALL load the package of the `typedids` setting `ids-package`, when the overlay sets it, from the target directory and write the names of its types with underlying `[16]byte` into the `typedids` setting `names` (an error when the package does not load), SHALL merge `<dir>/golangci/overlay.yml` when it exists (a mapping merges by key, a sequence of the overlay appends after the sequence of the base, a scalar of the overlay replaces), and SHALL write `<dir>/.golangci.yml` and `<dir>/golangci/rules.go`. Each written file SHALL start with a comment that names the generator. With the flag `-check` it SHALL write nothing, SHALL print the path of each file that differs from the rendered content or is absent, and SHALL exit with status 1 when it printed a path and 0 otherwise. It SHALL exit with status 2 and a message when the target directory has no `go.mod`.

#### Scenario: A first run

- **WHEN** a developer runs `inflexa-lint-config -dir <repo>` in a repository with `module example.com/svc`, and its overlay sets the `typedids` setting `ids-package: example.com/svc/kernel/ids`
- **THEN** `<repo>/.golangci.yml` holds the `names` of that package under `typedids`, `<repo>/golangci/rules.go` holds the ruleguard rules, and both start with the generator comment

#### Scenario: An overlay adds a local choice

- **WHEN** `<repo>/golangci/overlay.yml` holds `issues: {new-from-merge-base: main}` and `linters: {exclusions: {rules: [{path: ^scripts/, linters: [gosec]}]}}`
- **THEN** the generated file holds `new-from-merge-base: main`, and the exclusion rule of the overlay after each exclusion rule of the base

#### Scenario: Drift in CI

- **WHEN** a person edits the generated `.golangci.yml`, and CI runs `inflexa-lint-config -check`
- **THEN** the command prints `.golangci.yml`, changes no file, and exits with status 1

### Requirement: The generated configuration loads and runs in inflexa-lint

The generated configuration SHALL load in `inflexa-lint` without an error: each linter name exists, each setting key is known, and each plugin decodes its settings. A test of the module SHALL build `cmd/inflexa-lint` one time and prove it with `inflexa-lint linters -c <generated file>` in a fixture module, whose overlay enables the plugins that the base leaves off. A second test SHALL run `inflexa-lint run` with the generated configuration on that fixture module, which requires `github.com/quasilyte/go-ruleguard/dsl`, and SHALL assert one report each from sloglint, depguard, gocritic ruleguard and a plugin, and that `//nolint:<name> // reason` on a line that two plugins report removes the report of the plugin `<name>` only.

#### Scenario: The linters command accepts the file

- **WHEN** the test renders the base and the overlay of the fixture module and runs `inflexa-lint linters -c <file>` in it
- **THEN** the command exits with status 0 and lists each of the eleven plugin names

#### Scenario: The run on the fixture

- **WHEN** the test runs `inflexa-lint run -c <file> ./...` in the fixture module
- **THEN** the output holds a sloglint issue, a depguard issue, a gocritic ruleguard issue and an `errtext` issue, and the line that `errtext` and `notfoundguard` both report and that carries `//nolint:errtext // the module exports no sentinel yet` has a `notfoundguard` issue and no `errtext` issue

#### Scenario: The version of the built binary

- **WHEN** the test runs the built binary with `version`
- **THEN** the output contains `+golint.(devel)`
