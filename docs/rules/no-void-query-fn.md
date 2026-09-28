# no-void-query-fn

Make each query function give a value. Do not let it give `undefined`.

## Why

TanStack Query stores the value of a query function in its cache. The library does not accept `undefined` as that value: the query fails at run time, and no type shows the cause. A query function that only does work, and gives no value, belongs in a mutation.

## What the rule reports

The rule examines the value of each property named `queryFn` in an object literal, in the property, method and shorthand forms. It reports the value when the first call signature of its type gives `void` or `undefined`. A union with `void` or `undefined` counts too, and so does a promise of one. For example:

- `queryFn: async () => { await load() }`
- `queryFn: () => fetchTodo()`, where `fetchTodo` gives `Promise<Todo | undefined>`
- A function with a branch that has no `return`.

## What the rule leaves alone

- A function that gives a value, also `null`, `0` or `false`.
- `queryFn: () => fetchTodos()`, where `fetchTodos` gives `Promise<Todo[]>`.
- A property named `queryFn` outside of an object literal.

## How the rule decides

The command `inflexa-typecheck` of `@inflexa-ai/typecheck` runs the rule, through the typecheck plugin of `@inflexa-ai/oxlint-plugin-react/typecheck`. The id of the rule is `@inflexa-ai/react/no-void-query-fn`:

```ts
import { plugin as react } from '@inflexa-ai/oxlint-plugin-react/typecheck'
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  plugins: [react],
  overrides: [{ files: ['src/**'], rules: { '@inflexa-ai/react/no-void-query-fn': 'error' } }],
})
```

The API of TypeScript 7 has no function that gives the awaited type. Thus the rule follows the checker: it takes the type of the first parameter of the `onfulfilled` callback of `then`, and it does that again while the type is a thenable.

## Origin

The rule is a port of `no-void-query-fn` of the package `@tanstack/eslint-plugin-query` 5.103.2, to the API of TypeScript 7. The upstream package has the MIT license. The `NOTICE` file of `@inflexa-ai/oxlint-plugin-react` holds its copyright and its license text.
