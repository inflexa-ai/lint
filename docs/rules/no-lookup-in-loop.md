# no-lookup-in-loop

Look up a value inside a loop through a `Set` or a `Map`. Do not scan an array on each pass.

This is a typed rule of `@inflexa-ai/typecheck`. `typecheck()` turns it on for each TypeScript file.

## Why

`selected.includes(row.id)` inside a loop over `rows` reads each element of `selected` one time for each row. Thus the work grows with the product of the two sizes. A small test input does not show the cost. A customer with a thousand of each gets a million comparisons.

Before the loop, build the index one time:

```ts
const chosen = new Set(selected)
const kept = rows.filter((row) => chosen.has(row.id))

const usersById = new Map(users.map((user) => [user.id, user]))
const owners = rows.map((row) => usersById.get(row.userId))
```

## What the rule reports

A call on an array that the loop does not declare, inside a loop:

- A value lookup: `includes`, `indexOf` and `lastIndexOf`.
- A predicate lookup whose callback gives one equality, `===` or `==`: `find`, `findIndex`, `findLast`, `findLastIndex`, `some` and `filter`.

A `for...of` statement inside a loop, over an array that the outer loop does not declare, when its body compares an element to a value with `===` or `==`. This is the search that `includes` or `find` does, written by hand:

```ts
for (const row of rows) {
  for (const s of selected) {
    if (s === row.id) {
      count += 1
      break
    }
  }
}
```

One side of the comparison is the element, or a chain of property reads from it, for example `user.id`. The other side does not read the element. The rule reports the inner `for...of` statement.

These parts of the code run on each pass of a loop:

- The body of a `for`, `for...of`, `for...in`, `while` or `do` statement.
- The condition of a `for`, `while` or `do` statement, and the update of a `for` statement.
- The callback of an array method that calls it for each element, for example `map`, `filter` or `reduce`.

## What the rule leaves alone

- A lookup outside of a loop. One scan costs one pass.
- A method of the same name on a string, for example `name.includes(prefix)`.
- An array that each pass gets again, for example `row.tags.includes(tag)` or `load().includes(id)`. One index cannot serve each pass.
- A predicate with a different test, for example a range, a prefix, or two equalities. A `Set` or a `Map` of one key cannot answer it.
- The iterated expression of a `for...of` statement, which runs one time.
- An inner `for...of` statement with no equality between an element and a value, for example `user.name.startsWith(row.name)`. A comparison inside a function that the body only makes does not count.

## Related rules

`unicorn/prefer-set-has` reports a constant array that the code only reads with `includes`. This rule reports the scan in the loop, where the cost multiplies. The fix of each rule is a `Set`.
