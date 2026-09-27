# no-direct-zustand

Build a store with a store factory. Do not import zustand directly.

## Why

A store that zustand makes with its module-level `create()` is a singleton. Its state outlives navigation, and every instance of the feature shares it. A store factory of the repository scopes a store to its mounted `Provider` instead. So zustand itself is imported only where that factory lives.

## What the rule reports

- An import from `zustand` or from a subpath of it. A type import counts too, and the factory re-exports the one type that a store file needs.

## What the rule leaves alone

- The module of the factory, when the configuration of the repository leaves it out. The rule has no exception of its own, and the factory imports zustand to build a store.

## Options

- `hint` — a sentence that names the factory of this repository. The rule adds it to the message.
