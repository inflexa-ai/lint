# store-placement

Keep stores in store files, and keep server data out of them. A store file is a file whose name matches `storeFilePattern`, by default `*.store.ts`.

## Why

The rule is two halves of one guarantee: client state is findable, and it is only client state. A store lives in a file that is named for what it is. That file cannot reach the things that would let server data leak into it.

## What the rule reports

- The store factory, used outside a store file. Move the store into a store file beside the primary component of the feature. Then every piece of client state has a home that can be found by name.
- An import of server data inside a store file. A store holds client state only. A copy of server data is stale as soon as the query refetches. Read server data from the query in the component that renders it.

## What the rule leaves alone

- An import of server data outside a store file. The rule reports server data only in a store file.
- The factory half until `factorySource` is set. With no module named, the rule reports no import.

## Options

- `storeFilePattern` — the file names that count as store files, as a regular expression. Default: `\\.store\\.ts$`.
- `factorySource` — the module that exports the factory. Default: none. The module belongs to each repository, and without it the placement half has nothing to find.
- `bannedInStores` — the imports that a store file cannot make, as regular expressions. Default: `['^@tanstack/(react-)?query']`.
