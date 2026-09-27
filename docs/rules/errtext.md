# errtext

Classify an error by its identity. Do not classify it by its text.

## Why

The text of an error is for a person. When a branch tests `err.Error()`, the branch depends on the words of a message in another package. A change of those words breaks the branch, and the compiler does not see it. A sentinel error or an error type is a contract that `errors.Is` and `errors.As` can test.

## What the rule reports

- A call `e.Error()` on a value `e` of the interface type `error`, when the call is:
  - an operand of `==` or `!=`
  - an argument of `strings.Contains`, `strings.HasPrefix`, `strings.HasSuffix` or `strings.EqualFold`
  - the tag or a case expression of a `switch`

The fix is a sentinel error or an error type in the package that returns the error. The caller then uses `errors.Is` or `errors.As`.

## What the rule leaves alone

- `Error()` in any other position, for example as a log argument.
- `Error()` on a value of a concrete type. That type states its own contract.

## Settings

None.
