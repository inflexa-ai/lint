## MODIFIED Requirements

### Requirement: The base configuration holds the tuned linters and their settings

The base configuration of `golint` SHALL be a golangci-lint v2 file with `linters.default: none` that enables exactly these linters: errcheck, govet, ineffassign, staticcheck, unused, errorlint, nilnesserr, noctx, sloglint, forbidigo, containedctx, asasalint, bidichk, durationcheck, fatcontext, loggercheck, makezero, reassign, sqlclosecheck, gosec, testifylint, usetesting, thelper, exhaustive, musttag, unconvert, gocritic, revive, godoclint, nolintlint, misspell, copyloopvar, intrange, modernize, gocognit, depguard, and the eleven plugins. It SHALL set: govet `enable-all` without `fieldalignment` and `shadow`, errcheck without `check-blank`, sloglint `context: scope`, `key-naming-case: snake` and `forbidden-keys: [err]`, forbidigo `analyze-types: true` with patterns for `context.Background`, `context.TODO`, `http.Get`, `http.Post`, `http.PostForm`, `http.Head`, `http.DefaultClient`, `time.Sleep` and `http.Error`, gosec without G101, G104 and G404, exhaustive `default-signifies-exhaustive: true`, gocognit `min-complexity: 30`, nolintlint `require-explanation`, `require-specific` and `allow-unused: false`, revive with the default rules without `exported`, `package-comments` and `unused-parameter` plus `datarace`, `defer`, `identical-branches`, `identical-ifelseif-conditions`, `identical-switch-conditions`, `unconditional-recursion`, `waitgroup-by-value` and `range-val-address`, the exclusion paths `^docs/` and `(^|/)internal/repo/`, exclusion rules that skip noctx, gosec and forbidigo in test files, gosec in `testutil/` and `kernel/ids/gen/`, and forbidigo and gocognit in `cmd/`, `testutil/` and `kernel/ids/gen/`, the formatters gofmt and goimports with the module path as local prefix, `run.relative-path-mode: gomod`, `exclusions.generated: strict`, `issues.uniq-by-line: false`, `issues.max-issues-per-linter: 0` and `issues.max-same-issues: 0`.

#### Scenario: A linter of the tuned set runs

- **WHEN** the generated configuration lints a file that holds `slog.Error("x", "err", err)` in a function with a `ctx` parameter
- **THEN** sloglint reports the missing context and the key `err`

#### Scenario: A discarded error is the job of blankerr

- **WHEN** the generated configuration lints `_ = f()` with no `SAFETY:` comment
- **THEN** `blankerr` reports the line and errcheck does not

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
