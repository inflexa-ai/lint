# no-empty-schema

Let a schema look at the data. Do not write a schema that accepts whatever it receives.

## Why

A schema turns untyped data into typed data. A schema that looks at nothing is a cast in the shape of a schema.

The rule matters most where a schema is necessary. A backend does not trust a request from a client, so the backend gives every request a schema. There, `z.any()` satisfies the type, gives back whatever arrived, and at the call site looks like checked data. That is worse than a plain cast, which at least says what it does.

## What the rule reports

- `z.any()`.
- `z.unknown()`.
- `z.custom<T>()` with no argument. With no argument, it looks at nothing at all.

The message asks for the shape, as in `z.object({ … })`, and the parse fails where the data arrives. Where the shape cannot be written as a schema, `z.custom<T>(check)` takes the function that decides it.

## What the rule leaves alone

- `z.custom<T>(check)` with a real function inside. A function that tells a `FormData` from a body built in another realm is a schema. Structural tests of this kind are the reason the builder exists.
- An `any()` call on an object that is not the zod namespace.

## How the rule finds zod

The rule knows the receiver by its import, not by its local name. It matches an import from `zod` and from a module named `zod.ts` that re-exports it. So `import { z as schema }` and a namespace import give the same finding. A file that imports nothing from zod and still writes a free `z` is covered too, because nothing declares a global of that name.

The rule does not trace a builder pulled out of the namespace first, as in `const build = z.any`. Nobody writes that shape. It appears only when a person works around this rule.
