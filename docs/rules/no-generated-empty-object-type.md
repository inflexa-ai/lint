# no-generated-empty-object-type

Do not write a type operation that gives the empty object type, `{}`.

## Why

`{}` accepts each value except `null` and `undefined`. A type operation can give `{}` by accident: `Omit<{ a: string }, 'a'>` removes each key, and `Pick<Data, never>` keeps no key. The code that uses such a type reads it as a shape, but the compiler checks nothing. No error at the use shows the mistake.

## What the rule reports

The rule examines each intersection type, and each type reference with type arguments that is not a member of an intersection. It reports the type when its type, or a member of its union, is an object type with these properties:

- It is not a class and not an interface.
- It has no property, no index signature, no call signature and no construct signature.
- It accepts both `number` and `string`.

For example, the rule reports `Omit<{ a: string }, 'a'>` and `NonNullable<unknown>`.

## What the rule leaves alone

- A type that keeps a member: `{ a: 1 } & { b: 2 }` and `Pick<{ a: string; b: number }, 'a'>`.
- A `{}` that the code writes out: `type Empty = {}`. The rule examines type operations only.
- A type that waits for its type arguments, for example `Record<keyof T, unknown>` in a generic declaration. Such a type has no members yet, but it does not accept both `number` and `string`.
- An empty class and an empty interface.

## How the rule decides

The command `inflexa-typecheck` of `@inflexa-ai/typecheck` runs the rule on the program of each project. `typecheck()` turns on the rule for each TypeScript file, `**/*.{ts,tsx}`. To turn it off for a folder, set the rule to `'off'` in an override:

```ts
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  overrides: [{ files: ['src/generated/**'], rules: { 'no-generated-empty-object-type': 'off' } }],
})
```

## Origin

The rule is a port of `no-generated-empty-object-type` of typescript-eslint 8.70.1, to the API of TypeScript 7. typescript-eslint has the MIT license. The `NOTICE` file of `@inflexa-ai/typecheck` holds its copyright and its license text.
