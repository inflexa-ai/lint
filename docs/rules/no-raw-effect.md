# no-raw-effect

Write an effect as a named hook. Do not import the effect primitives of react in app code.

## Why

The effect primitives stay out of app code. In app code:

- Compute a derived value during render.
- React to a user action in its event handler.
- Load data with TanStack Query.
- Reset state by a change of a `key`.

A reusable effect belongs in a named hook, in a file that the configuration of the repository exempts from this rule.

All three effect primitives are banned together. A ban of `useEffect` alone would make `useLayoutEffect` the obvious way around the rule.

## What the rule reports

Every way a file can get hold of the names `useEffect`, `useLayoutEffect` and `useInsertionEffect` of `react`:

- A named import, also under a different local name.
- A re-export from `react`.
- A member access on the default import or on the namespace import, as in `React.useEffect`.
- A destructure of the default or namespace import.
- `export *` from `react`, which hands out the banned names.

## What the rule leaves alone

- The namespace copied into a second variable, as in `const R = React`. No file is written that way.
- `await import('react')`, which hands the module out at runtime. To load react lazily inside an app that already renders is not a thing that anyone does.

## How the rule decides

The rule bans the import, not the call. That closes the ways around the rule: an aliased import and a member access are the same violation, and the name that a call is written under never matters.

## Options

- `names` — the react exports that the rule reports. Default: `['useEffect', 'useLayoutEffect', 'useInsertionEffect']`.
- `hint` — a sentence that names the replacement of this repository. The rule adds it to the message.
