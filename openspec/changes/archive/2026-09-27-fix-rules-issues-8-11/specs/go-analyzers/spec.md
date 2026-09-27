## MODIFIED Requirements

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

### Requirement: notfoundguard reports an unguarded 404 and a fallback 4xx with the text of an error

For `notfoundguard`, the error test of a statement is the innermost enclosing `if` chain or `switch` whose condition or case expression implies that a value `e` of type `error` is not `nil` where the statement runs: `e != nil` in the true branch, or `e == nil` in the else branch, with the same implication rules as for a guard. A guard call is a call of `errors.Is`, `errors.As`, `errors.AsType`, or a function named in the setting `guards` (a list of `<import path>.<name>`), with `e` as an argument. A guard is a guard call, or a boolean identifier that the init statement of the same `if` assigns from a guard call, in a condition that holds where the statement runs: a condition whose true branch holds the statement, or a negated condition whose else branch holds it, among the condition of the error test itself and the `if` conditions and `switch` case expressions between the error test and the statement. A guard in another branch of the same `if` chain is not a guard of the statement. A condition implies a guard when: under `&&` one operand implies it, under `||` each operand implies it, a negation (`!`, `== false`, `!= true`) inverts the polarity, and a `switch` case with a list of expressions needs the guard in each expression. The analyzer SHALL report a call that passes the constant `http.StatusNotFound` of `net/http` as an argument, when the call has an error test and no guard. It SHALL also report a call that passes a `net/http` status constant from 400 to 499, when the call has an error test whose block holds at least one guard, the call itself has no guard, and an argument of the call contains, at any depth, a value of interface type `error` or a call of `Error()` on such a value. It SHALL leave alone a statement with no error test, and an `Error()` on a value of a concrete type.

#### Scenario: Each lookup error becomes 404

- **WHEN** a handler holds `mount, err := m.GetMount(ctx, id); if err != nil { response.WriteError(w, http.StatusNotFound, "mount not found") }`
- **THEN** the analyzer reports the write

#### Scenario: Guarded and ownership writes

- **WHEN** one handler writes 404 under `if pgerr.IsNotFound(err)` with `guards: [<module>/kernel/pgerr.IsNotFound]`, a second writes 404 inside `if err != nil { switch { case errors.Is(err, ErrNotFound): ... } }`, and a third writes 404 under `if mount.ProjectID != projectID`
- **THEN** the analyzer reports none of the three writes

#### Scenario: A guard in the init statement

- **WHEN** a handler writes 404 inside `if err != nil { if _, ok := errors.AsType[*NotFoundError](err); ok { ... } }`
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
