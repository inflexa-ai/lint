# no-inline-query-key

Take a query key from the data module that owns the resource. Do not write the key out at the call.

## Why

A key belongs to the module that owns the resource. `billingQueries.all(orgId)` is that key. A caller that writes `['billing', orgId]` out again holds a second copy of it. The day that the data module changes its key, the copy goes on matching nothing. The cache is never dropped, the screen keeps stale data, and every test stays green. A filter that matches no entry is not a failure.

A typo in a namespace is already a compile error: the `Register` union refuses a namespace that the app never declared. A key that is spelled right and duplicated is what nothing else sees.

## What the rule reports

- An array literal as the key of a call on the query client or on the query cache. The array inside the filters or the options object of such a call counts too.
- A literal that spreads a factory call and adds elements after it, as in `[...billingQueries.all(orgId), "usage"]`. The elements after the spread are the half that drifts. A prefix that no entry yields yet is an entry that the data module gains.
- A call that goes through an indirection, where the arguments cannot be read. Call the method directly, as in `queryClient.invalidateQueries({ queryKey: billingQueries.all(orgId) })`.

## What the rule leaves alone

- A key with one owner: a factory call, a variable, or the `.queryKey` of an entry.
- A key that arrives through a spread of a filters object, as in `{ ...base, queryFn }`. The property is declared in another object and possibly in another file.

## How the rule decides

The rule asks the compiler which class resolved the method. It matches the classes of `@tanstack/query-core` that reach the cache: `QueryClient` and `QueryCache`. That is a fact about the type of the receiver, not about its spelling.

A rule that matched a receiver named `queryClient` would miss `client`. It would miss the method pulled into a variable of its own. It would report an `invalidateQueries` on an unrelated object.

The rule needs the type information of typescript-eslint. oxlint does not give type information to a JS plugin. Thus ESLint runs this rule, through the configuration of `@inflexa-ai/oxlint-plugin-react/eslint`. Without type information, the rule stops the run with an error. It does not guess from a name.

The library reports the same shape with its own rule, but only on a client that the file declares. An imported client is invisible to it. A route loader and an event handler use an imported client, because those live outside a component and take the shared client of the app. That is the code most likely to reach the cache.
