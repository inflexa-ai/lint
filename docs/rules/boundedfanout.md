# boundedfanout

Bound each fan-out. Give each goroutine a join or a stop.

## Why

A goroutine for each element of an input starts as many goroutines as the input has elements. A large input then exhausts the connections of a pool, or the memory of the process. A goroutine with no join and no stop outlives its caller, and nothing can stop it at shutdown.

## What the rule reports

- A goroutine inside the body of a `for` or `for ... range` statement, also through a nested function literal, when no bound is present. A goroutine is a `go` statement, a call of `Go` on a `sync.WaitGroup`, or a call of `Go` or `TryGo` on an `errgroup.Group` of `golang.org/x/sync/errgroup`. Each of these is a bound:
  - A `SetLimit` call on the same group, in the enclosing function declaration. `SetLimit(-1)` removes the limit and `SetLimit(0)` blocks each `Go`, thus a constant at or below zero is not a bound. A width that the code computes, for example `runtime.NumCPU()`, is a bound.
  - A semaphore acquire in the body of the innermost loop, before the goroutine and outside it. The rule accepts a send on a channel, for example `sem <- struct{}{}`, and a call of `Acquire` or `TryAcquire` on a `*semaphore.Weighted` of `golang.org/x/sync/semaphore`.
  - A constant count on each enclosing loop, for example `for range 4` or `for i := 0; i < workers; i++` with a constant `workers`.
- A `go` statement or a call of `Go` on a `sync.WaitGroup`, in a package outside `allowed-packages`. The enclosing function is the innermost function declaration, through each function literal. The rule reports the goroutine unless one of these conditions is true:
  - The function returns a type of the same package that has a method of `stop-methods`. This is a constructor of a type with a lifecycle.
  - The function is a method of `start-methods` on such a type.
  - The function calls `Wait` on a `sync.WaitGroup` or an `errgroup.Group`. This is a join.

A goroutine in a loop with no bound and no join gets the two reports. A join through a channel does not count, for example a goroutine that closes a `done` channel which the function reads later. Put `//nolint:boundedfanout // reason` on such a `go` statement, and give the join in the reason. A limit that comes from a variable, for example `runtime.NumCPU()`, also needs a `//nolint` comment with the reason.

## What the rule leaves alone

- `go b.run()` in `Broker.Start`, when `Broker` has a `Stop` method.
- A fan-out that acquires a semaphore before each goroutine, and joins with `wg.Wait()`.
- A worker pool with a constant count, for example `for range 4 { wg.Go(worker) }`.
- An `errgroup.Group.Go` outside a loop.
- Each `go` statement and each `sync.WaitGroup.Go` of a package in `allowed-packages`.

The base configuration applies the rule outside `cmd/`, because `main` starts its servers for the life of the process. It also skips test files.

## Settings

- `allowed-packages` — the import path prefixes of the packages that can start goroutines with no restriction, for example the package of the bounded helpers. Default: none.
- `stop-methods` — the method names that stop a type. Default: `Stop`, `Close`, `Shutdown`.
- `start-methods` — the method names that start a type. Default: `Start`, `Run`.

A setting that is present replaces the default. An empty list gives an empty set.
