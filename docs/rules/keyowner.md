# keyowner

Take a key from the package that owns it.

## Why

A cache, lock, channel or queue key is a contract of the module that owns it. A copy of its text in another module breaks without a compile error when the owner changes the key. The copy also hides which modules read and write the key. The key builder of the owner is the one place that makes the key.

## What the rule reports

- A string expression with a constant value that starts with a `prefix` of `keys`. The rule reports it in each package other than `owner` and the packages under `owner/`. A literal, a named constant and a concatenation of constants all count. The rule reports the outermost constant expression, thus `prefix + "name"` gets one report.

The message names the owner package.

## What the rule leaves alone

- The key text inside the owner package and the packages under it, for example `modules/iam/tests`.
- A reference to a constant that the owner package declares, for example `iam.QueueMaintenance` in another package. The reference is the correct way to share a key, and the owner can change the value with no change in the caller.
- A string whose value does not start with a prefix of `keys`.
- An expression that is not constant, for example `"iam_" + name`.
- Import paths and struct tags.

The base configuration holds no key. A repository lists its keys in its overlay. It adds one entry for each literal prefix of its key builders, and one entry for each queue name.

## Settings

- `keys` — a list of entries with `prefix` (the start of the key text) and `owner` (the import path of the owner package). Default: none.
