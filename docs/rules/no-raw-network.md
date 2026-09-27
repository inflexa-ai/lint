# no-raw-network

Route network access through the API client. Do not call the network globals from feature code.

## Why

Every request of the app goes through the API client, so authentication, the error shape, cancellation and the sign-out path exist once. A stray `fetch` starts a second, slightly different copy of all four.

## What the rule reports

- A read of a network global: `fetch`, `XMLHttpRequest`, `EventSource` and `WebSocket` by default.
- A method on `navigator` that sends data, `navigator.sendBeacon` by default.
- The qualified spellings of the same globals, for example `globalThis.fetch` and `window.navigator.sendBeacon`, at any depth. A qualified spelling names the same global.

## What the rule leaves alone

- A parameter, an import or a local named `fetch`, for example the injected `fetch` of the API client itself. The rule asks the scope which binding a name resolves to.
- A `window` or a `navigator` that a file declares for itself.
- `typeof fetch` in a type position. It names the type and calls nothing.

## Options

- `globals` — the network globals that the rule reports. Default: `['fetch', 'XMLHttpRequest', 'EventSource', 'WebSocket']`.
- `navigatorMethods` — the methods on `navigator` that the rule reports. Default: `['sendBeacon']`.
- `hint` — a sentence that names the client of this repository. The rule adds it to the message.
