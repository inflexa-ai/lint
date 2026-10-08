# require-abort-signal

Give every call into the API client, and every `fetch`, a `signal` that can end the request.

## Why

A request that nobody can end outlives the thing that asked for it. A query function that forgets its signal does not stop when its component goes away, and it writes the answer into the cache. A throttled call sits through a wait of up to thirty seconds for each attempt, and nothing can cut the wait short.

## What the rule reports

- A call that no one can end: no options, options without a `signal`, a `signal` that is optional, or a `signal` that can be `null` or `undefined`. Pass a `signal` typed `AbortSignal`, not `AbortSignal | undefined`.
- A call whose options are typed `any`. The type `any` promises no `signal` at all.
- A call that goes through an indirection, where the options cannot be read. Call the method directly, as in `api.get(path, { signal })`. App code has no use for the indirection.

Where nothing in the program can cancel the call, a mutation among them, use a deadline: `AbortSignal.timeout(ms)`. Where both exist, combine them with `AbortSignal.any([signal, AbortSignal.timeout(ms)])`. `AbortSignal.any` first shipped in Chrome 116, Edge 116, Firefox 124 and Safari 17.4. For an older browser, use the function in [Combine signals in an older browser](#combine-signals-in-an-older-browser). A wrapper declares `signal: AbortSignal` in its own options, and the compiler then asks its callers for one.

## Combine signals in an older browser

`anySignal` aborts its signal when one of the given signals aborts, with the reason of that signal. It uses only APIs that Chrome 98, Edge 98, Firefox 97 and Safari 15.4 ship. When its signal aborts, it removes its listeners from the given signals.

```ts
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { signal: controller.signal })
  }
  return controller.signal
}
```

Pass its signal to the call, as in `api.get(path, { signal: anySignal([signal, AbortSignal.timeout(ms)]) })`.

## How the rule decides

The rule knows a call by where its signature is declared, not by the name of the variable that holds the client. A client is built once and passed around under whatever name the feature gives it. A rule that matched `api.get` would miss `org.get` and would report `map.get`.

A `fetch` is known by the name of its declaration in a declaration file. The platform, a polyfill and a library all share the name and the shape, and each honours a `signal`.

The rule needs the type information of the program. oxlint does not give type information to a JS plugin. Thus the command `inflexa-typecheck` of `@inflexa-ai/typecheck` runs this rule on the program of each project. The id of the rule is `require-abort-signal`. Turn it on for the files of the app in the `overrides` of `typecheck.config.ts`, with its options:

```ts
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  overrides: [{ files: ['src/**'], rules: { 'require-abort-signal': ['error', { declaredIn: ['/src/api/'] }] } }],
})
```

## What the rule leaves alone

- Everything but the leaf of the call. A wrapper whose own `signal` is optional is reported inside it. When the wrapper declares `signal: AbortSignal`, the compiler makes every caller supply one. The obligation then climbs, by ordinary types, to the context of a query, to the controller of a loader, or to a deadline.

## Options

- `declaredIn` — the files that declare the functions of the client, as regular expressions. The rule tests each expression on the file name of the declaration, as the file system spells it. Default: `[]`. With no file named, the rule reports nothing.
