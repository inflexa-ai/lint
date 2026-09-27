# no-interface

Declare an object shape with `type`. Keep `interface` for declaration merging.

## Why

A second `interface` with the same name merges into the first, and no duplicate-name error appears. `type` also expresses unions, mapped types and conditional types. Thus one keyword covers every shape in the program.

Merging is the one thing that `interface` does and `type` cannot. That merging is the whole point inside `declare module '…'` and `declare global`, so the rule leaves those homes alone. The rule leaves them alone at every depth: `declare global { namespace NodeJS { interface ProcessEnv { … } } }` is how `process.env` gets its keys. A top-level `declare namespace Foo` is not a home, because nothing there merges into a first declaration.

## What the rule reports

- An `interface` outside the merge homes. The message gives the direct forms: `type Props = { … }`, and `type A = B & { … }` where an interface extends another.

## What the rule leaves alone

- An `interface` inside `declare module '…'` or `declare global`, at any depth. There the merging is the purpose.

## No automatic fix

The direct form of `interface A extends B` is an intersection. The message spells that out, and the rule changes nothing by itself.

## Why the shared alternative does not fit

`@typescript-eslint/consistent-type-definitions` with `'type'` reports an `interface` inside `declare module 'x'`, and its fix rewrites the interface to a type alias. The rewrite leaves the augmentation in place while the merge silently stops. That rule withholds the fix inside `declare global` only. Module augmentation is certain here: TanStack Router takes the type of the router through `declare module '@tanstack/react-router' { interface Register { … } }`. The alternative is an inline disable in every file with an augmentation, and an exception in that form spreads to the next file.
