# require-assertion-safety

State the reason for a type assertion in a `SAFETY:` comment.

## Why

`value as Target` tells the compiler to stop checking and to believe the annotation. The dangerous forms are reported elsewhere: `as unknown as T` by `no-double-cast`, and an `as` that narrows a type that the compiler cannot trace by `@typescript-eslint/no-unsafe-type-assertion`. What is left is an assertion that the compiler accepts. It is sound only because of something the writer knows and the types do not say: a discriminant that the line above compares, a backend contract that the program owns, a value that the runtime built.

That reason is invisible to the next reader. The rule asks for it in a `SAFETY:` comment on the assertion or on the statement that holds it. One comment answers for every assertion of the statement, where a person reads it.

## What the rule reports

- An `as` or `<T>` assertion with no `SAFETY:` comment before it, up to the statement that owns it.

## What the rule leaves alone

- `as const`. It freezes a literal and widens nothing, so it carries no claim to justify.
