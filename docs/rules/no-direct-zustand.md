# no-direct-zustand

Build a store with the feature-store factory. Do not import zustand directly.

## Why

A store that zustand makes with its module-level `create()` is a singleton. Its state outlives navigation, and every instance of the feature shares it. The feature-store factory of the hooks package scopes a store to its mounted `Provider` instead. So zustand itself is imported only in the hooks package.

## What the rule reports

- An import from `zustand` or from a subpath of it. A type import counts too, and the factory re-exports the one type that a store file needs.

## What the rule leaves alone

- The hooks package, which imports zustand to build the factory.

## Options

- `hint` — a sentence that names the factory of this repository. The rule adds it to the message.
