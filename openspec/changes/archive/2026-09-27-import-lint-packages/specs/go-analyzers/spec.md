## MODIFIED Requirements

### Requirement: Each analyzer is a package with a constructor and tests

Each of the analyzers `typedids`, `errtext`, `notfoundguard`, `blankerr`, `boundedfanout`, `detachedctx`, `keyowner`, `rawhttp`, `anyapi`, `testplacement` and `swagsync` SHALL live in its own package of the module `github.com/inflexa-ai/lint/golint`, SHALL export `New(Settings) *analysis.Analyzer` and an `Analyzer` built with the default settings, and SHALL have an `analysistest` test whose testdata holds a `// want` comment for each report and a case that gets no report. The analyzer name SHALL equal the package name. No analyzer SHALL hold an import path, a type name, a method name or a key of one consumer repository in its code or in a default setting. A setting key that is present SHALL replace the default, and an empty list SHALL give an empty set.

#### Scenario: The tests of the module pass

- **WHEN** a developer runs `go test ./...` at `golint/`
- **THEN** each analyzer test passes, and a removed `// want` comment fails the test of that analyzer with an unexpected diagnostic

#### Scenario: The module path

- **WHEN** a developer runs `go list -m` and `go list ./...` at `golint/`
- **THEN** the module is `github.com/inflexa-ai/lint/golint`, and each package of the module imports its sibling packages under that path

### Requirement: keyowner reports a key value outside its owner

`keyowner` SHALL take the setting `keys`, a list of entries with `prefix` and `owner` (an import path). It SHALL report a string expression with a constant value (a literal, a named constant, or a concatenation of constants) whose value starts with `prefix`, in a package whose import path is neither `owner`, nor the external test package `owner_test` of that directory, nor a path under `owner/`. It SHALL leave alone a reference to a constant that the owner package declares. The message SHALL name the owner package.

#### Scenario: A queue name of another module

- **WHEN** `keys` holds `{prefix: iam_maintenance, owner: <module>/modules/iam}`, `modules/iam/jobs.go` holds `queueMaintenance = jobsModulePrefix + "maintenance"` with `jobsModulePrefix = "iam_"`, and `modules/worker/runner.go` holds `Queue: "iam_maintenance"`
- **THEN** the analyzer reports the literal in `worker` only

#### Scenario: The exported constant of the owner

- **WHEN** `modules/iam/jobs.go` declares `const QueueMaintenance = "iam_maintenance"`, and `modules/worker/runner.go` holds `Queue: iam.QueueMaintenance`
- **THEN** the analyzer reports nothing

### Requirement: rawhttp reports a raw HTTP client and a raw body read outside the approved packages

`rawhttp` SHALL report a composite literal of type `net/http.Client` in a package whose import path starts with no entry of the setting `client-packages`. It SHALL report a call of `json.NewDecoder` or `io.ReadAll` whose argument is the field `Body` of a `*net/http.Request`, in a package whose import path starts with no entry of the setting `body-packages`.

#### Scenario: A client outside the approved package

- **WHEN** `client-packages` holds `<module>/cmd/cli`, and `provider/acme/client.go` holds `&http.Client{Timeout: t}` while `cmd/cli/internal/client.go` holds the same literal
- **THEN** the analyzer reports the first and not the second

#### Scenario: A body read in a handler

- **WHEN** `body-packages` holds `<module>/handler/request`, and `handler/v1/billing/webhook.go` holds `io.ReadAll(r.Body)`
- **THEN** the analyzer reports the call, and reports nothing for `json.NewDecoder(r.Body)` in `handler/request/decode.go`

### Requirement: testplacement reports a test file outside the tests folder

`testplacement` SHALL report, at its package clause, each `_test.go` file whose directory base name is not the setting `tests-dir` (default `tests`) and whose name does not end with the setting `internal-suffix` (default `_internal_test.go`).

#### Scenario: Two files beside the code

- **WHEN** a package directory holds `drive_credentials_test.go` and `gateway_internal_test.go`, and its `tests/` directory holds `drive_test.go`
- **THEN** the analyzer reports `drive_credentials_test.go` only
