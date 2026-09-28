# must-use-result

Use each neverthrow `Result`. Do not let a `Result` go away with no code that reads it.

## Why

A `Result` carries a failure as a value. The type tells the caller that the call can fail, and the caller must decide what to do with the failure. A `Result` that no code reads drops the failure in silence. That is the same error as an empty `catch`, and the type exists to prevent it.

## What the rule reports

The rule examines each call, `new` and `await` expression whose type is a `Result` or a `ResultAsync`. A type is a `Result` when its apparent type, or a member of its union, has each of `mapErr`, `map`, `andThen`, `orElse`, `match` and `unwrapOr`. The rule reports the expression when no code uses the value, for example:

- A statement that is only the call: `getResult()`, `await getResultAsync()`, or `obj.get()`.
- A variable that holds the value, with no reference that uses it: `const result = getResult()`. The rule reports the expression that gives the value, `getResult()`, not the name of the variable.
- A chain that ends in a transform: `result.map(() => {})`. The transform gives a new `Result`, and no code uses that `Result` either.
- A read of a property that does not use the value: `getResult().unwrapOr`, with no call.
- An argument of a function that the option `consumers` does not name: `externalFunction(result)`.

## What the rule leaves alone

The rule treats a value as used when one of these conditions is true:

- A call of a method that uses the value: `match`, `unwrapOr`, `_unsafeUnwrap`, `_unsafeUnwrapErr`, `isOk` or `isErr`. The call can be at the end of a chain of calls.
- A read of the property `error`, `value`, `isOk` or `isErr` of the value.
- A `return` statement or an arrow function above the value, up to the nearest block. Thus `return cond ? ok(1) : err('e')` and `(x) => f(getResult())` use the value.
- A `yield*` of the value in the generator function that `safeTry` receives.
- An element of an array that goes directly into a call that gives a `Result`, for example `Result.combine([a, b])`.
- An argument of a function that the option `consumers` names, directly or through a chain of `orElse`, `map`, `mapErr` or `andThen` calls.
- A variable that holds the value, with a reference that uses the value by one of the conditions above. The variable can get the value in its declaration, `const r = getResult()`, or in a later assignment, `r = await getResultAsync()`.

The rule looks through parentheses, `await`, `as`, `!` and `?.` between the value and its use. The rule does not examine a value directly under a type assertion (`as`, `satisfies`, `<T>`) or a non-null assertion. It does not examine the initializer of a class field, because it cannot trace `this.field` to the places that read it.

The rule counts a read of `isOk` or `isErr` as a use, also without a call. Thus the rule does not report `if (result.isOk) {}`, but that condition is always true. With `strictNullChecks`, `tsc` reports the condition as error TS2774, because a method is always defined. Without `strictNullChecks`, nothing reports it.

## Options

- `consumers` — the names of the functions that take a `Result` and use it. An example is a function that turns an `Err` into an exception at the edge of a step. The rule matches the name of the callee, not the import. Default: `[]`.

```ts
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  overrides: [{ files: ['src/**'], rules: { 'must-use-result': ['error', { consumers: ['unwrapOrThrow'] }] } }],
})
```

## How the rule decides

The command `inflexa-typecheck` of `@inflexa-ai/typecheck` runs the rule on the program of each project. The rule asks the checker for the type of each expression. It finds the references of a variable with the checker, in the file of the variable.

## Origin

The rule is a port of `must-use-result` of the package `@ninoseki/eslint-plugin-neverthrow` 0.3.2, to the API of TypeScript 7. The upstream package has the MIT license. The `NOTICE` file of `@inflexa-ai/typecheck` holds its copyright and its license text. The port adds the calls of `isOk`, `isErr` and `_unsafeUnwrapErr`, the reads of `error`, `value`, `isOk` and `isErr`, the option `consumers`, and the assignment to a variable that is declared earlier.
