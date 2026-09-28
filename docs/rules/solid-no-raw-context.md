# solid-no-raw-context

This document is for the rule `@inflexa-ai/solid/no-raw-context`. Make app contexts with a context factory. Do not import the context primitives of solid-js.

## Why

A context factory of the repository owns each context. The factory makes the provider and one consumer function. That function states what occurs when no provider is above it.

A raw `useContext` gives `undefined` when no provider is above it. Then each call site decides again what to do. The results differ: one call site throws an error, and a different call site uses `null`.

The factory hands back its own consumer function. Thus the rule bans `useContext` together with `createContext`: app code that uses `useContext` holds a raw context object from a place outside the factories.

## What the rule reports

Every way a file can get the names `createContext` and `useContext` of `solid-js`:

- A named import, also under a different local name.
- A re-export from `solid-js`.
- A member access on the namespace import, as in `Solid.useContext`.
- A destructure of the namespace import, also with a computed key that is a string, as in `const { ['useContext']: read } = Solid`.
- `export *` from `solid-js`, which hands out the banned names.

## What the rule leaves alone

- A type-only import or a type-only re-export. This includes a declaration with `type` and a specifier with `type`, as in `export { type useContext } from 'solid-js'`.
- A destructure with a computed key that is not a string, as in `const { [key]: value } = Solid`.
- A local binding that has the name of the namespace import, for example a parameter named `Solid`. The rule reports only a name that resolves to the import.
- The same names from a different module, for example `react`.
- The namespace copied into a second variable, as in `const S = Solid`. No file is written that way.
- `await import('solid-js')`, which hands the module out at runtime. No app loads its UI framework lazily after it renders.
- The file of the context factory. The repository turns the rule off for that file in its own configuration.

## How the rule decides

The rule bans the import, not the call. That closes the ways around the rule: an aliased import and a member access are the same violation, and the name of a call does not change the result.

The rule of the React plugin with the same name, `@inflexa-ai/react/no-raw-context`, has its document in [no-raw-context.md](./no-raw-context.md).

## Options

- `names` — the solid-js exports that the rule reports. Default: `['createContext', 'useContext']`.
- `hint` — a sentence that names the replacement of this repository. The rule adds it to the message.
