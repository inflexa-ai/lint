# no-unknown-type-guards

Parse unknown data with a schema. Do not write a type guard by hand.

## Why

`function isRecord(value: unknown): value is Record<string, unknown>` and its cousins are validators written by hand, one call site at a time. Each one looks for what its author remembered to look for. Nothing ties it to the type that it claims. The same guard is declared again in the next file.

Data of unknown type enters the program at a boundary: a response, a message, storage, a URL. A schema parses it there, once, and the schema is also the source of the type. Everything inward receives typed data and has nothing left to guard.

## What the rule reports

- A type predicate, `value is T`, on a function whose parameter is `unknown`, `any` or untyped.

## What the rule leaves alone

- A guard that narrows a known union, for example `part is ToolCall` out of `ChatPart`. It states a fact about types that the program already has.
