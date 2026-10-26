# no-accumulating-copy

Add to an accumulator in place. Do not copy the accumulator on each pass.

## Why

`acc.concat([item])` and `Object.assign({}, acc, entry)` copy the whole accumulator on each pass. Thus a `reduce` over n items does n² work. `oxc/no-accumulating-spread` reports the same copy written as `{ ...acc }` or `[...acc]`. This rule reports the copies that it does not read.

## What the rule reports

- `acc.concat(…)` and `Object.assign({}, acc, …)` inside the callback of `reduce` or `reduceRight`, where `acc` is the first parameter of the callback.
- `result = result.concat(…)` and `result = Object.assign({}, result, …)` inside the body of a loop.

## What the rule leaves alone

- One copy outside of a loop, as in `Object.assign({}, defaults, options)`.
- A copy of a different array than the accumulator.

## The fix

Add to the accumulator in place, or build the result in one step:

```ts
const all = groups.flatMap((group) => group.items)
const byId = Object.fromEntries(users.map((user) => [user.id, user]))
const index = new Map(users.map((user) => [user.id, user]))
```
