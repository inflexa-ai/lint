# no-unbounded-promise-all

Run one call for each element through a queue of fixed width. Do not start all of the calls at the same time with `Promise.all`.

## Why

`Promise.all(items.map(fetchOne))` starts each call at the same moment. A thousand items make a thousand open requests. Then the server, the pool of connections, or the rate limit fails first.

The code needs a limit on the number of calls in flight. Only a queue of fixed width gives that limit. A loop that awaits each call in turn keeps one call in flight, and `no-await-in-loop` reports it.

## What the rule reports

A call of `Promise.all`, `Promise.allSettled`, `Promise.any` or `Promise.race` whose argument starts one promise for each element of an input:

- `items.map(fn)` and `items.flatMap(fn)`, where `items` is not an array literal.
- `Array.from(items, fn)`.
- A spread of one of these into an array literal, as in `[...items.map(fn)]`.

## What the rule leaves alone

- An array literal of calls, as in `Promise.all([loadUser(id), loadProjects(id)])`. Its size is in the code.
- `Array.from({ length: width }, work)`, which starts a pool of workers. Its size is the width of the pool.
- A list of promises that other code makes, as in `Promise.all(pending)`.

## The fix

Use a library such as [`p-limit`](https://github.com/sindresorhus/p-limit), or copy this function into the repository:

```ts
/** The bounds of one run of `mapWithLimit`. */
type LimitOpts = {
  /** How many calls are in flight at one moment. A whole number of at least 1. */
  readonly concurrency: number
  /** Given to each call, and read again before each call. */
  readonly signal: AbortSignal
}

/**
 * Calls `fn` for each item, with at most `concurrency` calls in flight, and
 * gives the results in the order of the items. The workers share one cursor,
 * thus a slot fills again when its call settles.
 *
 * A worker records a failure and continues, and it never rejects. A rejection
 * that leaves a worker while a sibling is in flight reaches no handler of the
 * caller, and an unhandled rejection ends a Node.js process. One failure
 * throws as itself, and more than one throws as an `AggregateError`.
 */
export async function mapWithLimit<T, R>(items: readonly T[], { concurrency, signal }: LimitOpts, fn: (item: T, signal: AbortSignal) => Promise<R>): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError(`\`concurrency\` must be a whole number of at least 1, got ${concurrency}.`)
  signal.throwIfAborted()

  const results = new Array<R>(items.length)
  const failures: unknown[] = []
  const cursor = items.entries()

  async function work(): Promise<void> {
    for (const [index, item] of cursor) {
      if (signal.aborted) return
      try {
        // oxlint-disable-next-line no-await-in-loop -- the worker is the queue: it takes the next item only when its call settles
        results[index] = await fn(item, signal)
      } catch (error) {
        failures.push(error)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, work))
  signal.throwIfAborted()

  if (failures.length === 1) throw failures[0]
  if (failures.length > 1) throw new AggregateError(failures, 'More than one call failed. Read `errors` for each of them.')
  return results
}
```

Then write the call with a width:

```ts
const users = await mapWithLimit(ids, { concurrency: 8, signal }, (id, signal) => api.get(`/users/${id}`, { signal }))
```

## Options

- `hint`: the text of the message that names the queue. A repository that has its own queue names it here. `typescript()` sets it from its `queueHint` option.

## A loop that must run in order

Some loops must run one call at a time, for example pagination or a step that reads the result of the step before it. For such a loop, keep the `await` in the loop. Give the reason in a directive:

```ts
// oxlint-disable-next-line no-await-in-loop -- each page reads the cursor of the page before it
const page = await api.get(path, { query: { cursor }, signal })
```
