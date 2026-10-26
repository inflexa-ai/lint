# require-assertion-safety

State the reason for a type assertion in a `SAFETY:` comment.

## Why

`value as Target` tells the compiler to stop checking and to believe the annotation. The dangerous forms are reported elsewhere: `as unknown as T` by `no-double-cast`, and an `as` that narrows a type that the compiler cannot trace by `@typescript-eslint/no-unsafe-type-assertion`. What is left is an assertion that the compiler accepts. It is sound only because of something the writer knows and the types do not say: a backend contract that the program owns, or a value that the runtime built.

A narrowing is not a reason for a SAFETY comment. `no-unsafe-type-assertion` reports a narrowing `as`, and the comment has no effect on that rule. To narrow a value, use a check that TypeScript follows, such as a comparison of a discriminant or an `in` check.

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

Some forms make the same unchecked claim without an `as`:

- A type predicate, `x is T`, or an assertion, `asserts x is T`, over a known type. TypeScript believes the predicate and does not compare it with the body. TypeScript can infer the predicate from a check that it follows, so remove the predicate where possible.
- An overload set whose implementation declares a different return type. TypeScript only makes sure that the overload and the implementation are related, so each call trusts a return type that nobody checked.

## What the rule reports

- An `as` or `<T>` assertion with no `SAFETY:` comment before it, up to the statement that a block or the file holds.
- A type predicate or an `asserts` predicate over a parameter of a known type, with no `SAFETY:` comment before the function. A callback with no annotation that is a call argument has a known type, because the call gives it.
- An overload implementation whose declared return type differs from the return type of an overload, with no `SAFETY:` comment before the overloads or the implementation.

## What the rule leaves alone

- `as const`. It freezes a literal and widens nothing, so it carries no claim to justify.
- A type predicate over a parameter that admits a value of any shape, for example `unknown`, `object` or no annotation. `no-unknown-type-guards` reports it and asks for a schema.
- A predicate that TypeScript infers, a declaration with no body, and an `asserts x` with no type.
- An overload implementation with no declared return type, and an ambient overload set with no implementation.
