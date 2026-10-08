# use-query-signal

Use the signal that a query library gives to the query function.

## Why

A query library cancels a query when the component that asked goes away. It cancels by the signal that it hands the query function, and only that signal. A function that ignores the signal does not stop with the component, and it writes the answer into the cache.

A deadline of its own satisfies `require-abort-signal` and ends nothing at unmount. That is why this is a rule and not a convention.

## What the rule reports

- A query function, written in place beside its `queryKey`, that does not read the `signal` of its first argument. Read it, as in `({ signal }) => …`, and pass it on to the call. To bound the request as well, combine them: `AbortSignal.any([signal, AbortSignal.timeout(ms)])`. `AbortSignal.any` first shipped in Chrome 116, Edge 116, Firefox 124 and Safari 17.4. For an older browser, use the function in [Combine signals in an older browser](./require-abort-signal.md#combine-signals-in-an-older-browser).

## What the rule leaves alone

- A query function that names a function declared elsewhere. `require-abort-signal` and the types at the leaf of that function govern it. To trace the name is dataflow, which the compiler already does better.
- An object with a `queryFn` but no `queryKey`. A `queryKey` beside the `queryFn` is what makes an object a query.
- A key that arrives through a spread, as in `{ ...base, queryFn }`. The pair is not complete in this object.

## How the rule decides

The rule looks for a `queryKey` beside the `queryFn`, wherever the object is written: in a hook call, in `queryOptions`, as an entry of `useQueries`, or in a variable that a hook receives later. A match on the name of the enclosing call was wrong in both directions. An options object built above the call escaped, and an unrelated `database.query({ queryFn })` was reported. With inline disables not permitted, that is an expensive way to be wrong.

The rule asks the scope whether the function reads the signal, through a property or through a member access. A destructured `signal` that the body never mentions again drops the signal at the destructure. That leaves the request as uncancellable as one that never asked for a signal.

`@typescript-eslint/no-unused-vars` reports the dropped signal too, as a variable that nobody uses, and its suggestion is to remove the destructure. The correct fix is to pass the signal on.
