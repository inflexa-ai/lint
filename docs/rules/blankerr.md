# blankerr

State the reason for a discarded error in a `SAFETY:` comment.

## Why

An error that goes to the blank identifier disappears. Some discards are safe, for example `Close` on a file that the code only read. Other discards hide a real failure, for example a decode error that gives zero tokens and no log line. The reader cannot tell the two apart. A `SAFETY:` comment states why the discard is safe, as the `require-assertion-safety` rule asks for a type assertion.

## What the rule reports

- An assignment in which the blank identifier receives a value of type `error`: `_ = f()`, `x, _ := f()`, `x, _ = f()` and `_ = err`. The rule reports it when no line of the comment group directly above the statement holds `SAFETY:`.

The comment group must end on the line directly above the statement. A blank line between the comment and the statement breaks the link.

## What the rule leaves alone

- A blank identifier for a value of another type.
- The blank identifier of a `range` clause.
- A parameter named `_`.

errcheck keeps `check-blank: false`, thus one rule reports each discard.

## Settings

None.
