# no-raw-context

Make app contexts with a context factory. Do not import the context primitives of react.

## Why

A context re-renders every consumer when its value changes. App code can use a context only for a value that is settled before its subtree renders and keeps one identity while it is mounted. A context factory of the repository makes that context. State that changes belongs in a store.

The factory hands back its own consumer hook. So `useContext` is banned together with `createContext`: app code that reaches for `useContext` holds a raw context object from a place outside the factories.

## What the rule reports

Every way a file can get hold of the names `createContext` and `useContext` of `react`:

- A named import, also under a different local name.
- A re-export from `react`.
- A member access on the default import or on the namespace import, as in `React.useContext`.
- A destructure of the default or namespace import.
- `export *` from `react`, which hands out the banned names.

## What the rule leaves alone

- The namespace copied into a second variable, as in `const R = React`. No file is written that way.
- `await import('react')`, which hands the module out at runtime. To load react lazily inside an app that already renders is not a thing that anyone does.

## How the rule decides

The rule bans the import, not the call. That closes the ways around the rule: an aliased import and a member access are the same violation, and the name that a call is written under never matters.

## Options

- `names` — the react exports that the rule reports. Default: `['createContext', 'useContext']`.
- `hint` — a sentence that names the replacement of this repository. The rule adds it to the message.
