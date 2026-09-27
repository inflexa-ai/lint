# no-unsafe-dictionary

Give a dictionary a parsed value type. Do not give it an escape hatch.

## Why

`Record<string, unknown>`, `{ [key: string]: any }` and a mapped type over an `object` value are a container with a typed key and an untyped value. A read off one gives the escape hatch back, so the parsing that the value type skipped moves to every reader. The value has a shape where it enters the program. A zod schema parses it into a dictionary: `z.record(z.string(), Value)`.

## What the rule reports

The value types that give the reader no contract:

- `unknown` and `any`, which are unparsed.
- `object`, which is any value that is not a primitive.
- The empty object type `{}`, which admits everything except `null`.
- A union that contains one of these.

The forms are `Record<string, V>`, an index signature `{ [key: string]: V }` and a mapped type `{ [K in string]: V }`.

## What the rule leaves alone

- A `Record` of one's own that shadows the builtin. It is not the builtin.
- A name from another file. One file cannot see what it means.
- A generic container with the escape hatch inside, as in `Bag<unknown>` for `type Bag<T> = Record<string, T>`. One file cannot settle what `T` is.

## How far the rule traces

The rule traces the value through `readonly`, a union, and through an alias or an empty interface of the same file. So the hole cannot hide one hop away.
