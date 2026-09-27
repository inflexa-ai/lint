# no-unknown-returns

Return a parsed domain type. Do not return `unknown`.

## Why

A function whose return type is `unknown` hands the caller a value that it cannot read without narrowing. That pushes the parsing outward to every call site. `Promise<unknown>` is the same contract behind an `await`. A name that resolves to `unknown` is the same contract under an alias. The place to turn an unknown value into a domain type is the boundary where it entered the program, with a zod schema. The function then returns the type that the schema proved.

## What the rule reports

- A declared return type of `unknown`.
- A declared return type of `Promise<unknown>` or `PromiseLike<unknown>`.
- A return type that is a union with `unknown` in it.
- A return type that is an alias of the same file, which resolves to `unknown`.

## What the rule leaves alone

- A generic parameter. A function that returns `T` says nothing about `unknown`, even where a caller later picks `unknown` for `T`.
- An alias from another file. One file cannot see what a name in another file means.
- A generic alias, as in `type Box<T> = unknown`. The rule follows only an alias that names no type parameter.
