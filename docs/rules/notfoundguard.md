# notfoundguard

Answer 404 only for an error that a check classifies as "not found".

## Why

When each error of a lookup becomes a 404 answer, a database outage looks like a missing resource. The client then shows "not found", and no alert starts. A 4xx answer with the text of an unclassified error also sends internal messages to the client, for example a database error.

## What the rule reports

The error test is the innermost `if` statement or `switch` case that makes an error value `e` not `nil` at the call. That is `e != nil` in the true branch, or `e == nil` in the `else` branch. The implication rules below also apply to the error test. Thus `err != nil || m == nil` is no error test, because the call runs also with a `nil` error.

A guard call is a call of `errors.Is`, `errors.As`, `errors.AsType` or a function of `guards` that takes `e` as an argument. A guard is a guard call, or a boolean variable that the init statement of the same `if` or of the same `switch` with no tag gets from a guard call, as `ok` in `if _, ok := errors.AsType[*NotFoundError](err); ok`. The guard must be in a condition that holds where the call runs: a condition whose true branch holds the call, or a negated condition whose else branch holds it. The condition is the condition of the error test itself, or an `if` condition or a `switch` case between the error test and the call. A guard in another branch of the same `if` chain does not count.

The condition must make the guard true at the call:

- A negated guard, for example `!errors.Is(err, ErrNotFound)`, does not guard its true branch. It guards its `else` branch.
- Under `||`, each alternative must hold a guard. `errors.Is(err, ErrNotFound) || permitted` is not a guard, because `permitted` alone reaches the call.
- Under `&&`, one operand with a guard is enough.
- A negation turns `&&` into `||`, and `||` into `&&`. Thus `!(!errors.Is(err, ErrNotFound) && permitted)` is not a guard.
- A `switch` case with a list of expressions must have a guard in each expression.

The rule reports:

- A call that passes `http.StatusNotFound` as an argument, inside an error test, with no guard.
- A call that passes a `net/http` status from 400 to 499, inside an error test, with no guard, when:
  - the block of the error test holds at least one guard branch, also a negated one such as `if !errors.As(err, &v)`
  - an argument holds, at any depth, a value of the interface type `error` or an `Error()` call on one, for example `err.Error()` or `fmt.Sprintf("...: %v", err)`

A 404 in another branch of a guard is a report, for example the 404 in `if errors.Is(err, ErrForbidden) { 403 } else if err != nil { 404 }`. The 404 is then the answer for each other error.

The fix for the second report is a 500 answer with a constant message, and a log line that holds the error.

## What the rule leaves alone

- A call with no error test, for example a 404 after an ownership check such as `if mount.ProjectID != projectID`.
- A guarded call, for example a 404 under a configured guard such as `if store.IsNotFound(err)`, or under `case errors.Is(err, ErrNotFound):` inside `if err != nil`.
- A validation answer: a 400 in an error test whose block has no guard branch, for example after `uuid.Parse`.
- `Error()` on a value of a concrete type, for example the value that `errors.As` narrowed.

The analyzer knows no path, thus it reads each package. It reports only a `http.StatusNotFound` inside an error test, which an HTTP handler writes.

## Settings

- `guards` — more guard functions, as `<import path>.<name>`. `errors.Is`, `errors.As` and `errors.AsType` are always guards. Default: none.

The base configuration names no guard. A repository adds its guards in its overlay.
