# swagsync

Make the Swagger annotations of a handler agree with its code.

## Why

The API document comes from the annotations of the handlers. A route with no `@Router` line is absent from the document. A 4xx status that the handler writes and the annotations omit is an answer that no client expects. Without a check, the annotations and the code become different.

## What the rule reports

- A call of a method of `register-methods` whose second argument is a handler with no `@Router` line in its doc comment. The handler is the callee of a call such as `XHandler(deps)`, an identifier `XHandler`, or a selector `pkg.XHandler`. It can be in the same package or in another package. The rule reports the registration.
- A `net/http` status constant from 400 to 499 that no `@Success` or `@Failure` line lists. The constant is a call argument inside a handler with an `@Router` line. The rule also reads the nested function literals of the handler. It reports in the package that declares the handler.

The rule exports a fact on each function with an `@Router` line. Thus the registration in one package sees the doc comment of a handler in another package.

## What the rule leaves alone

- A status from 500 to 599. By convention the annotations omit `500`.
- A handler that is a function literal or a variable.
- A status that a helper writes, for example the `400` of `MustDecodeBody`. The rule sees only the constants inside the handler.

The base configuration applies the rule to `handler/`, and skips test files.

## Settings

- `register-methods` — the method names that register a route, with the handler as the second argument. Default: none.
