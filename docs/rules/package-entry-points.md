# package-entry-points

Reach a package through the entries that it declares. Do not reach into it by path.

## Why

The entries of a package are the whole of what the package promises. A file that is reached around them is private by intent. It can move or go away, and the compiler does not say so at the import site. A deep path resolves whether or not a person meant it to.

A relative climb out of a workspace does the same thing and also skips the package boundary. The dependency then appears in no `package.json`, and nothing can see that it exists.

## What the rule reports

- A specifier that names a package and then keeps going into it, for example `@acme/ui/src/components/button.tsx` or `@acme/hooks/dist/index.js`.
- A relative specifier that climbs out of the workspace of its own file, for example an import of `../../hooks/src/index.ts` from `packages/ui`.

The message gives the way out. Import a subpath that the package exports, and add an entry under `exports` in its `package.json` when the module has none. For a climb out of a workspace, import the other package by its name and declare it as a dependency.

## What the rule leaves alone

- The entries themselves, and the choice of what a package exports. That is decided in `exports`.
- The decision of which package can depend on which. `@inflexa-ai/react/no-app-concerns` governs that.
- A relative import inside a folder that is no workspace, for example a folder with shared build and test configuration. Those folders are reached relatively on purpose.

## How the rule decides

The rule reads specifiers only. It resolves the workspace of a file and of an import as paths. With no scope given, every scope counts.

## Options

- `scopes` — the scopes of the packages of this repository, for example `['@acme']`. Default: every scope.
- `workspaces` — the folders that hold one workspace in each child folder. Default: `['packages', 'apps']`.
