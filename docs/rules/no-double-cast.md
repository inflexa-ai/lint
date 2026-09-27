# no-double-cast

Cast to the target type in one step. Do not cast through `unknown` or `any`.

## Why

`value as unknown as Target` is not a cast. It is an instruction to stop type checking. The compiler refused the direct assertion because the two types have nothing in common, and the cast through `unknown` overrules that refusal. Every line after it believes the annotation, whatever the value really is.

## What the rule reports

- `value as unknown as Target`.
- `value as any as Target`.
- The angle-bracket form of the same casts.

## What the rule leaves alone

- A cast in one step, as in `value as Target`.
- A chain through a type other than `unknown` or `any`, as in `value as object as Target`.

## What to write instead

There is always something truer to write:

- Data from outside the program: parse it with a zod schema.
- A wrong declaration: correct the declaration.
- A value for a test: build it to satisfy the type, or give it the narrower type that the test works with.
