# store-placement

Keep stores in store files, and keep server data out of them. A store file is a file whose name matches `storeFilePattern`, by default `*.store.ts`.

## Why

The rule is two halves of one guarantee: client state is findable, and it is only client state. A store lives in a file that is named for what it is. That file cannot reach the things that would let server data leak into it.

## What the rule reports

- The store factory, used outside a store file. Move the store into a store file beside the primary component of the feature. Then every piece of client state has a home that can be found by name.
- An import of server data inside a store file. A store holds client state only. A copy of server data is stale as soon as the query refetches. Read server data from the query in the component that renders it.

## What the rule leaves alone

- An import of server data outside a store file. The rule reports server data only in a store file.
- The factory half until `factorySource` or `factoryFile` is set. With no module named, the rule reports no import.

## Options

- `storeFilePattern` — the file names that count as store files, as a regular expression. Default: `\\.store\\.ts$`.
- `factorySource` — the specifier of the module that exports the factory, for example an alias. The rule compares the text of each specifier with it. Default: none. The module belongs to each repository, and without it the placement half has nothing to find.
- `factoryFile` — the absolute path of the module that exports the factory. The rule resolves each relative specifier from the folder of the file, and reports a specifier that names this module. A specifier without the extension, with a different JS or TS extension, or with the folder of an `index` file names the same module. Default: none. Set it together with `factorySource`, because a relative import of the factory does not match the alias text.
- `bannedInStores` — the imports that a store file cannot make, as regular expressions. Default: `['^@tanstack/(react-)?query']`.
