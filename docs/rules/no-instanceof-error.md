# no-instanceof-error

Turn a thrown value into an `Error` in one module. Do not write a generic `instanceof Error` comparison in every catch block.

## Why

A caught value is `unknown`, thus the line `error instanceof Error ? error.message : String(error)` appears in every catch block. Most code has no reason to look inside the caught value:

- To add context, throw a new error with the original value as the cause: `throw new UploadError('…', { cause })`.
- To act on a failure the code understands, look for the specific class, as in `error instanceof ApiError`. The rule leaves that alone.
- TanStack Query already types `error` as `Error`.

What remains is the task of turning an arbitrary thrown value into an `Error` for a log or a telemetry event. One function does that task. The `allowIn` option names the file of that function, so the program does it once and not at every call site.

## What the rule reports

- `error instanceof Error`, with the global `Error` on the right.
- `Error.isError(value)` in any spelling: `Error.isError?.(value)` and `Error['isError'](value)` too. The method asks the same question across realms. It is new in ES2026, and the `lib` setting of the repository cannot express it yet. The rule covers it now, so a later raise of `lib` does not quietly open a second spelling of the same question.

## What the rule leaves alone

- A comparison with a specific class, as in `error instanceof ApiError`.
- A class of one's own that is called `Error`. The rule knows the constructor by the binding that it resolves to. So `globalThis.Error` and `window.Error` are the same finding, and an unrelated class is not.
- The global copied into a variable first. Nobody renames the one class that every program already has.

## Options

- `allowIn` — file name patterns where the rule stays silent. List the one module that normalizes thrown values there.
