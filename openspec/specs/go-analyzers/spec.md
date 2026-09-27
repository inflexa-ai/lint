# go-analyzers Specification

## Purpose
The Go analyzers of Inflexa catch the smells of a Go service that a configuration alone cannot express: each one combines types, control flow or project facts, and each fact that is special to one repository arrives as a setting.

## Requirements

### Requirement: Each analyzer is a package with a constructor and tests

Each of the analyzers `typedids`, `errtext`, `notfoundguard`, `blankerr`, `boundedfanout`, `detachedctx`, `keyowner`, `rawhttp`, `anyapi`, `testplacement` and `swagsync` SHALL live in its own package of the module `github.com/inflexa-ai/lint/golint`, SHALL export `New(Settings) *analysis.Analyzer` and an `Analyzer` built with the default settings, and SHALL have an `analysistest` test whose testdata holds a `// want` comment for each report and a case that gets no report. The analyzer name SHALL equal the package name. No analyzer SHALL hold an import path, a type name, a method name or a key of one consumer repository in its code or in a default setting. A setting key that is present SHALL replace the default, and an empty list SHALL give an empty set.

#### Scenario: The tests of the module pass

- **WHEN** a developer runs `go test ./...` at `golint/`
- **THEN** each analyzer test passes, and a removed `// want` comment fails the test of that analyzer with an unexpected diagnostic

#### Scenario: The module path

- **WHEN** a developer runs `go list -m` and `go list ./...` at `golint/`
- **THEN** the module is `github.com/inflexa-ai/lint/golint`, and each package of the module imports its sibling packages under that path

### Requirement: typedids reports a uuid.UUID that has a typed ID

`typedids` SHALL take the settings `ids-package` (an import path) and `names` (the typed ID names). It SHALL report a struct field, a function parameter or a function result whose name ends with a name of `names` (`<X>ID`, or `<x>ID` for an unexported name) and whose type is `uuid.UUID` or `*uuid.UUID` of `github.com/google/uuid` or of the standard library package `uuid`. The message SHALL name the typed ID with the package name of `ids-package`. The analyzer SHALL need no import path from the analyzed package to `ids-package`.

#### Scenario: A field with a typed ID counterpart

- **WHEN** `names` holds `UserID`, and a struct in a package that does not import the typed ID package declares `RevokedByUserID *uuid.UUID`
- **THEN** the analyzer reports the field with a message that names `ids.UserID`

#### Scenario: A field of the standard library uuid

- **WHEN** `names` holds `UserID`, and a struct in a package that imports `uuid` of the standard library declares `UserID uuid.UUID`
- **THEN** the analyzer reports the field with a message that names `ids.UserID`

#### Scenario: A name that is not a typed ID

- **WHEN** `names` holds `UserID` and `OrgID`, and a struct declares `ResourceID uuid.UUID`
- **THEN** the analyzer reports nothing for that field

### Requirement: errtext reports a condition on the text of an error

`errtext` SHALL report a call `e.Error()` where `e` has the interface type `error`, when the call is an operand of `==` or `!=`, an argument of `strings.Contains`, `strings.HasPrefix`, `strings.HasSuffix` or `strings.EqualFold`, or the tag or a case expression of a `switch`. It SHALL leave alone `Error()` in any other position, and `Error()` on a value of a concrete type.

#### Scenario: A branch on the text

- **WHEN** a handler holds `if strings.Contains(err.Error(), "circular nesting") {`
- **THEN** the analyzer reports the `err.Error()` call

#### Scenario: The text in a log

- **WHEN** a function holds `slog.Error("failed", "error", err.Error())`
- **THEN** the analyzer reports nothing

### Requirement: notfoundguard reports an unguarded 404 and a fallback 4xx with the text of an error

For `notfoundguard`, the error test of a statement is the innermost enclosing `if` chain or `switch` whose condition or case expression implies that a value `e` of type `error` is not `nil` where the statement runs: `e != nil` in the true branch, or `e == nil` in the else branch, with the same implication rules as for a guard. A guard call is a call of `errors.Is`, `errors.As`, `errors.AsType`, or a function named in the setting `guards` (a list of `<import path>.<name>`), with `e` as an argument. A guard is a guard call, or a boolean identifier that the init statement of the same `if`, or of the same `switch` with no tag, assigns from a guard call, in a condition that holds where the statement runs: a condition whose true branch holds the statement, or a negated condition whose else branch holds it, among the condition of the error test itself and the `if` conditions and `switch` case expressions between the error test and the statement. A guard in another branch of the same `if` chain is not a guard of the statement. A condition implies a guard when: under `&&` one operand implies it, under `||` each operand implies it, a negation (`!`, `== false`, `!= true`) inverts the polarity, and a `switch` case with a list of expressions needs the guard in each expression. The analyzer SHALL report a call that passes the constant `http.StatusNotFound` of `net/http` as an argument, when the call has an error test and no guard. It SHALL also report a call that passes a `net/http` status constant from 400 to 499, when the call has an error test whose block holds at least one guard, the call itself has no guard, and an argument of the call contains, at any depth, a value of interface type `error` or a call of `Error()` on such a value. It SHALL leave alone a statement with no error test, and an `Error()` on a value of a concrete type.

#### Scenario: Each lookup error becomes 404

- **WHEN** a handler holds `mount, err := m.GetMount(ctx, id); if err != nil { response.WriteError(w, http.StatusNotFound, "mount not found") }`
- **THEN** the analyzer reports the write

#### Scenario: Guarded and ownership writes

- **WHEN** one handler writes 404 under `if pgerr.IsNotFound(err)` with `guards: [<module>/kernel/pgerr.IsNotFound]`, a second writes 404 inside `if err != nil { switch { case errors.Is(err, ErrNotFound): ... } }`, and a third writes 404 under `if mount.ProjectID != projectID`
- **THEN** the analyzer reports none of the three writes

#### Scenario: A guard in the init statement

- **WHEN** a handler writes 404 inside `if err != nil { if _, ok := errors.AsType[*NotFoundError](err); ok { ... } }`
- **THEN** the analyzer reports nothing

#### Scenario: A guard in the init statement of a switch

- **WHEN** a handler writes 404 inside `if err != nil { switch _, ok := errors.AsType[*NotFoundError](err); { case ok: ... } }`
- **THEN** the analyzer reports nothing

#### Scenario: A call in the init statement that is not a guard

- **WHEN** a handler writes 404 inside `if err != nil { if _, ok := lookup(err); ok { ... } }`, and `lookup` is not a guard
- **THEN** the analyzer reports the write

#### Scenario: A guard of another branch

- **WHEN** a handler holds `if errors.Is(err, ErrForbidden) { response.WriteError(w, http.StatusForbidden, "no") } else if err != nil { response.WriteError(w, http.StatusNotFound, "not found") }`
- **THEN** the analyzer reports the 404 write

#### Scenario: A fallback 400 with the error text

- **WHEN** an `if err != nil` block holds `errors.As` branches, one of them writes `response.WriteError(w, http.StatusUnprocessableEntity, escalation.Error())` where `escalation` is `*AccessModeEscalationError`, and the block ends with `response.WriteError(w, http.StatusBadRequest, err.Error())`
- **THEN** the analyzer reports the last write and not the `errors.As` branch

#### Scenario: A validation answer

- **WHEN** a handler holds `id, err := uuid.Parse(s); if err != nil { response.WriteError(w, http.StatusBadRequest, fmt.Sprintf("invalid id: %s", err)) }` with no guard in the block
- **THEN** the analyzer reports nothing

### Requirement: blankerr reports a discarded error without a SAFETY comment

`blankerr` SHALL report an assignment in which a blank identifier receives a value of type `error` (`_ = f()`, `x, _ := f()`, `x, _ = f()`, `_ = err`), unless a line of the comment group that ends on the line directly above the statement contains `SAFETY:`. It SHALL leave alone a blank identifier for a value of another type, the blank identifier of a `range` clause, and a parameter named `_`.

#### Scenario: A discard with no comment

- **WHEN** a function holds `_ = s.Metadata.ToStruct(&env)` with no comment above it
- **THEN** the analyzer reports the statement

#### Scenario: A discard with a SAFETY comment on two lines

- **WHEN** the two lines above `_ = f.Close()` are `// SAFETY: the file was opened read-only,` and `// thus Close cannot lose data`
- **THEN** the analyzer reports nothing

#### Scenario: A blank line breaks the link

- **WHEN** `// SAFETY: ...` is followed by a blank line and then `_ = f()`
- **THEN** the analyzer reports the statement

### Requirement: boundedfanout reports unbounded fan-out and a goroutine without a lifecycle or a join

`boundedfanout` SHALL report a call of `Go` on a `*golang.org/x/sync/errgroup.Group` inside the body of a `for` or `for ... range` statement, also through a nested function literal, when the enclosing function declaration has no `SetLimit` call on the same group. It SHALL also report a `go` statement whose enclosing function declaration (the innermost one, through any function literal) sits in a package whose import path starts with no entry of the setting `allowed-packages`, unless that function returns a type of the same package that has a method named in the setting `stop-methods` (default `Stop`, `Close`, `Shutdown`), or is a method named in the setting `start-methods` (default `Start`, `Run`) of such a type, or calls `Wait` on a `sync.WaitGroup` or an `errgroup.Group`.

#### Scenario: One goroutine for each grant

- **WHEN** a method holds `g, gCtx := errgroup.WithContext(ctx); for _, grant := range grants { g.Go(func() error { ... }) }`
- **THEN** the analyzer reports the `g.Go` call, and reports nothing when `g.SetLimit(8)` precedes the loop

#### Scenario: A goroutine in a constructor without Stop

- **WHEN** `NewPricingResolver` holds `go r.refreshLoop()` and `PricingResolver` has no `Stop`, `Close` or `Shutdown` method
- **THEN** the analyzer reports the `go` statement

#### Scenario: A lifecycle and a join

- **WHEN** `func (b *Broker) Start(ctx context.Context)` holds `go b.run()` and `Broker` has a `Stop` method, and another function holds `var wg sync.WaitGroup; go func() { defer wg.Done(); ... }(); wg.Wait()`
- **THEN** the analyzer reports neither `go` statement

### Requirement: detachedctx reports a request context in a cleanup

`detachedctx` SHALL report a call inside a `defer` statement (a direct call, or the body of a deferred function literal) or inside a function literal passed to a method named in the setting `hook-methods`, when an argument of the call is an identifier of type `context.Context` that is declared outside that deferred call or literal and is not detached. A context is detached when its value comes from `context.WithoutCancel` or `context.Background`, directly or through further `context.With*` calls, followed through the declarations of the identifiers. A call whose callee belongs to a package named in the setting `exempt-packages` (default `log/slog`) SHALL get no report.

#### Scenario: A deferred delete with the request context

- **WHEN** a function with the parameter `ctx` holds `defer func() { if err := storage.Delete(ctx, bucket, key); err != nil { slog.Error("failed", "error", err) } }()`
- **THEN** the analyzer reports the `storage.Delete` call and not the `slog.Error` call

#### Scenario: A detached context through a wrapper

- **WHEN** `hook-methods` holds `AfterCommit`, and a hook holds `tx.AfterCommit(func() { d := context.WithoutCancel(ctx); d2, cancel := context.WithTimeout(d, t); defer cancel(); m.deps.Invalidator.Invalidate(d2, params) })`
- **THEN** the analyzer reports nothing

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

### Requirement: anyapi reports any in an exported API

`anyapi` SHALL report an exported function or method whose parameter or result has the type `any` or `map[string]any`, an exported method of the method set of an exported interface type (also a method that an embedded interface of the same module gives it, and not a method of an embedded interface from another module, whose signature the repository cannot change) with such a parameter or result, and an exported field of an exported struct type with such a type. It SHALL leave alone a variadic `...any` parameter, an unexported function, method, type or field, a named type whose underlying type is a map, and a method named in the setting `exempt-methods` (default `Scan`).

#### Scenario: A map field

- **WHEN** an exported struct declares `Conditions map[string]any` and another declares `Metadata types.JSONMap`
- **THEN** the analyzer reports the first field and not the second

#### Scenario: A log-style variadic

- **WHEN** an exported function declares `func Log(msg string, args ...any)`
- **THEN** the analyzer reports nothing

### Requirement: testplacement reports a test file outside the tests folder

`testplacement` SHALL report, at its package clause, each `_test.go` file whose directory base name is not the setting `tests-dir` (default `tests`) and whose name does not end with the setting `internal-suffix` (default `_internal_test.go`).

#### Scenario: Two files beside the code

- **WHEN** a package directory holds `drive_credentials_test.go` and `gateway_internal_test.go`, and its `tests/` directory holds `drive_test.go`
- **THEN** the analyzer reports `drive_credentials_test.go` only

### Requirement: swagsync reports a route without annotations and a 4xx that the annotations omit

`swagsync` SHALL, for each call of a method named in the setting `register-methods`, resolve the second argument to a function: the callee of a call expression, an identifier, or a selector, in the same package or in another one. It SHALL report the registration when the doc comment of that function has no line that contains `@Router`. In the package that declares a function whose doc comment has an `@Router` line, it SHALL report each `net/http` status constant from 400 to 499 that appears as a call argument inside that function (nested function literals included) and whose code no `@Success` or `@Failure` line of the doc comment lists.

#### Scenario: A route with no annotations, across packages

- **WHEN** `register-methods` holds `HandleGET`, and `v1/routes.go` holds `g.HandleGET("/health", probe.HealthHandler)` where `probe.HealthHandler` has no doc comment
- **THEN** the analyzer reports the registration in `v1/routes.go`

#### Scenario: A status the annotations omit

- **WHEN** a handler with `@Router` lists `@Failure 400`, `@Failure 403`, `@Failure 404`, and its body holds `response.WriteError(w, http.StatusConflict, "exists")` and `response.WriteError(w, http.StatusInternalServerError, "failed")`
- **THEN** the analyzer reports the `http.StatusConflict` argument only
