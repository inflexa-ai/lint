# require-assertion-safety

State the reason for a type assertion in a `SAFETY:` comment.

## Why

`value as Target` tells the compiler to stop checking and to believe the annotation. The dangerous forms are reported elsewhere: `as unknown as T` by `no-double-cast`, and an `as` that narrows a type that the compiler cannot trace by `@typescript-eslint/no-unsafe-type-assertion`. What is left is an assertion that the compiler accepts. It is sound only because of something the writer knows and the types do not say: a discriminant that the line above compares, a backend contract that the program owns, a value that the runtime built.

That reason is invisible to the next reader. The rule asks for it in a `SAFETY:` comment. One comment answers for every assertion of the statement that holds them, where a person reads it.

## Where the comment goes

Write the comment above the statement that holds the `as`, or before the `as` on its line. The statement is the nearest one that a block or the file holds.

A statement in a body without braces belongs to its `if` or loop. Write the comment above the `if` or the loop:

```ts
// SAFETY: isNode narrows the value to an ElementNode.
if (isNode(value)) return value as ElementNode
```

A comment above an `if` or a loop does not reach the statements inside its block. Write the comment inside the block, above the statement that holds the `as`:

```ts
if (isNode(value)) {
  // SAFETY: isNode narrows the value to an ElementNode.
  return value as ElementNode
}
```

A comment above a function does not reach an `as` in an `if` test or in a loop head of that function. The `if` or the loop is the statement that holds it.

## What the rule reports

- An `as` or `<T>` assertion with no `SAFETY:` comment before it, up to the statement that a block or the file holds.

## What the rule leaves alone

- `as const`. It freezes a literal and widens nothing, so it carries no claim to justify.
