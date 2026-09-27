# no-raw-state

Give each kind of app state its designated home. Do not use the raw state primitives of react.

## Why

In app code, each kind of state has one home:

- Server data: TanStack Query.
- Shareable view state, as filters, tabs, selection and pagination: the route search params.
- Form fields: TanStack Form.
- State that the components of one feature share: a `*.store.ts` file built with the feature-store factory.
- An open/close flag: an uncontrolled primitive or a disclosure hook.

State that a reusable component owns belongs with that component in the UI package. The primitives of react give none of these homes, so `useState` and `useReducer` are banned in app code.

## What the rule reports

Every way a file can get hold of the names `useState` and `useReducer` of `react`:

- A named import, also under a different local name.
- A re-export from `react`.
- A member access on the default import or on the namespace import, as in `React.useState`.
- A destructure of the default or namespace import.
- `export *` from `react`, which hands out the banned names.

## What the rule leaves alone

- The namespace copied into a second variable, as in `const R = React`. No file is written that way.
- `await import('react')`, which hands the module out at runtime. To load react lazily inside an app that already renders is not a thing that anyone does.

## How the rule decides

The rule bans the import, not the call. That closes the ways around the rule: an aliased import and a member access are the same violation, and the name that a call is written under never matters.

## Options

- `names` — the react exports that the rule reports. Default: `['useState', 'useReducer']`.
- `hint` — a sentence that names the replacement of this repository. The rule adds it to the message.
