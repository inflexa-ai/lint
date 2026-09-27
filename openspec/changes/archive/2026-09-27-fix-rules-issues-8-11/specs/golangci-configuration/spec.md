## MODIFIED Requirements

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
