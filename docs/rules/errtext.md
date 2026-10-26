# errtext

Classify an error by its identity. Do not classify it by its text.

## Why

The text of an error is for a person. When a branch tests `err.Error()`, the branch depends on the words of a message in another package. A change of those words breaks the branch, and the compiler does not see it. A sentinel error or an error type is a contract that `errors.Is` and `errors.As` can test.

## What the rule reports

- A call `e.Error()` on a value `e` of the interface type `error`, when the call is:
  - an operand of `==` or `!=`
  - an argument of `strings.Contains`, `strings.ContainsAny`, `strings.HasPrefix`, `strings.HasSuffix`, `strings.EqualFold`, `strings.Index` or `strings.LastIndex`
  - an argument of `regexp.MatchString` or of the `MatchString` method of a `*regexp.Regexp`
  - the tag or a case expression of a `switch`
- A local variable that gets its value from `e.Error()`, for example `msg := err.Error()`, in one of the same positions. The rule reports the use of the variable.

The fix is a sentinel error or an error type in the package that returns the error. The caller then uses `errors.Is` or `errors.As`.

## What the rule leaves alone

- `Error()` in any other position, for example as a log argument. The same applies to a local variable that holds the text.
- The text after a second step, for example a field of a struct or the result of `strings.ToLower(msg)`.
- `Error()` on a value of a concrete type. That type states its own contract.

## Settings

None.
