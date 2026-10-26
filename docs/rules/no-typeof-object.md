# no-typeof-object

Parse unknown data with a schema. Do not probe it with `typeof value === 'object'`.

## Why

`typeof value === 'object' && value !== null && 'key' in value && …` is a schema written out in boolean operators. It is the inline form of the hand-written guard that `no-unknown-type-guards` reports, and it has the same answer: parse the value with a zod schema where it enters the program.

## What the rule reports

- A comparison of `typeof` with the string `'object'`, with `===`, `!==`, `==` or `!=`.
- The same comparison through a `const` that holds the `typeof`, as in `const kind = typeof value` and then `kind === 'object'`.
- A `case 'object'` of a `switch` on `typeof`.
- `value instanceof Object`, with the global `Object` on the right.
- `Object(value) === value` and `Object(value) !== value`. `Object(value)` gives the value itself only for an object.

## What the rule leaves alone

- `typeof x === 'string'` and the comparisons with the other primitive names. They usually narrow a union that the program already knows, and that is ordinary TypeScript.
- A `let` that holds the `typeof`. Other code can assign a new value to it.
- A class of one's own that is called `Object`.
