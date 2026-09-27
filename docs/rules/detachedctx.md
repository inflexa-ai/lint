# detachedctx

Give a cleanup a context that the request cannot cancel.

## Why

A deferred call, or a hook that runs after a commit or a rollback, runs when the request can be over. The request context is then canceled, and a cleanup that takes it fails immediately. The upload stays in the bucket, or the cache keeps a stale entry. `context.WithoutCancel` keeps the values of the context, for example the trace, and removes the cancellation.

## What the rule reports

- A call inside a `defer` statement, or inside the body of a deferred function literal, that passes a context which the request can cancel.
- A call inside a function literal that is an argument of a method of `hook-methods`, with the same condition.

The rule reports an argument that is an identifier of type `context.Context`, declared outside the deferred call or the function literal. It does not report the argument when the context is detached. A context is detached when each value of its identifier comes from `context.WithoutCancel` or `context.Background`, directly or through more `context.With*` calls.

## What the rule leaves alone

- A detached context, for example `d := context.WithoutCancel(ctx)`, then `context.WithTimeout(d, t)`.
- A context declared inside the deferred call or the function literal.
- The call `context.WithoutCancel(ctx)` itself, which is the fix.
- A call to a package of `exempt-packages`, or to a package under one of them.

## Settings

- `hook-methods` — the method names that take a cleanup function, for example `AfterCommit` and `OnRollback`. Default: none.
- `exempt-packages` — the import paths whose calls get no report. Default: `log/slog`.

The base configuration adds `go.opentelemetry.io/otel` to `exempt-packages`, because a metric or a span records with any context.
