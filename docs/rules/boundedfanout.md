# boundedfanout

Bound each fan-out. Give each goroutine a join or a stop.

## Why

A goroutine for each element of an input starts as many goroutines as the input has elements. A large input then exhausts the connections of a pool, or the memory of the process. A goroutine with no join and no stop outlives its caller, and nothing can stop it at shutdown.

## What the rule reports

- A call of `Go` on a `*errgroup.Group` of `golang.org/x/sync/errgroup` inside the body of a `for` or `for ... range` statement, also through a nested function literal. The rule reports it when the enclosing function declaration has no `SetLimit` call on the same group.
- A `go` statement in a package outside `allowed-packages`. The enclosing function is the innermost function declaration, through each function literal. The rule reports the statement unless one of these conditions is true:
  - The function returns a type of the same package that has a method of `stop-methods`. This is a constructor of a type with a lifecycle.
  - The function is a method of `start-methods` on such a type.
  - The function calls `Wait` on a `sync.WaitGroup` or an `errgroup.Group`. This is a join.

A join through a channel does not count, for example a goroutine that closes a `done` channel which the function reads later. Put `//nolint:boundedfanout // reason` on such a `go` statement, and give the join in the reason.

## What the rule leaves alone

- `go b.run()` in `Broker.Start`, when `Broker` has a `Stop` method.
- A fan-out that joins with `wg.Wait()`.
- Each `go` statement of a package in `allowed-packages`.

The base configuration applies the rule outside `cmd/`, because `main` starts its servers for the life of the process. It also skips test files.

## Settings

- `allowed-packages` — the import path prefixes of the packages that can start goroutines with no restriction, for example the package of the bounded helpers. Default: none.
- `stop-methods` — the method names that stop a type. Default: `Stop`, `Close`, `Shutdown`.
- `start-methods` — the method names that start a type. Default: `Start`, `Run`.

A setting that is present replaces the default. An empty list gives an empty set.
