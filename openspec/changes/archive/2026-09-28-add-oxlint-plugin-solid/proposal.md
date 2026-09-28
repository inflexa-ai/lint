# Proposal

## Why

The cli of `inflexa-ai/inflexa` is a SolidJS terminal UI (`@opentui/solid`) that must move from ESLint to oxlint, and it uses `eslint-plugin-solid` today. `@inflexa-ai/oxlint-plugin-react` does not fit it: `react()` turns on the React hook and React Compiler rules for each TypeScript file (`oxlint/react/src/index.ts:168-190`), the package installs the TanStack, Testing Library and Playwright plugins (`oxlint/react/package.json:67-74`), and the bans of raw state, effect and context match only the module `react` (`oxlint/react/src/helpers/react-primitive-ban.ts:68,75,83,90`). `eslint-plugin-solid` runs as an oxlint JS plugin and reads no type information, thus a Solid package can give the same `solid/*` reports under oxlint (#17).

## What Changes

- The helper that bans the named exports of a module moves from the React package to `oxlint/typescript/src/helpers/`, with a `module` option. The React rules use it with `'react'`, and their messages stay the same.
- A new npm package `@inflexa-ai/oxlint-plugin-solid` in `oxlint/solid/`, with the layout of `oxlint/react/` and the shared version of the workspace.
- The shared version of the npm packages moves from 0.3.0 to 0.4.0, and each dependency on `@inflexa-ai/oxlint-plugin` becomes `^0.4.0`. The published 0.3.0 of the TypeScript package has no ban helper, and the release pins each package of the workspace to the exact shared version, thus a Solid or React package at 0.3.0 cannot load the moved helper. The user chose this version.
- Its factory `solid(options)` builds on `typescript()`. It registers `eslint-plugin-solid` (a dependency of the package) with the rules of `eslint-plugin-solid/configs/typescript`, turns on `solid/prefer-show`, and writes its `version` option to `settings.solid.version`.
- The package adds two rules under `@inflexa-ai/solid/`: `no-raw-context`, a ban of `createContext` and `useContext` of `solid-js` outside a context factory, and `require-cleanup`, which asks for an `onCleanup` in the component body that subscribes with `.on(...)`, `addEventListener(...)` or `setInterval(...)`.
- The documents of the Solid rules take the prefix `solid-` (`docs/rules/solid-no-raw-context.md`, `docs/rules/solid-require-cleanup.md`), because `docs/rules/` is flat and the React plugin already has `no-raw-context.md`.
- The release script builds, smoke-tests and packs the Solid package with the others, and the release workflow runs when its manifest changes. The first publish of the package is local, because npm trusted publishing needs a package that exists.
- The specs and the documents that name the packages of the workspace name the Solid package too.

## Capabilities

### New Capabilities

- `solid-plugin`: the Solid package, its factory `solid()`, and its rules `no-raw-context` and `require-cleanup`.

### Modified Capabilities

- `lint-rule-documentation`: the contract covers the rules of the Solid plugin, whose documents carry the prefix `solid-`.
- `package-licensing`: the Solid package declares Apache-2.0 and carries the license text.
- `self-linting`: the workspace lints the Solid package, and its `plugin.ts` joins the files that bridge the rule types.
- `oxlint-configuration`: `solid()` returns a root configuration, and it carries the return-type rule of `typescript()`.
- `package-ci`: the release stages, smoke-tests and publishes each package of the workspace, the Solid package included.

## Impact

- Code: the manifests and the lock file of `oxlint/` (version 0.4.0), `oxlint/typescript/src/helpers/`, the React rules `no-raw-context`, `no-raw-effect` and `no-raw-state`, the new `oxlint/solid/` package, `oxlint/package.json` (workspaces), `oxlint/oxlint.config.ts`, `oxlint/scripts/release.mjs`, `.github/workflows/release-oxlint.yml`.
- Dependencies: `eslint-plugin-solid` `^0.18.0`, the first release line that accepts ESLint 10 as a peer. The cli uses 0.14.5 today.
- Documents: `docs/rules/solid-no-raw-context.md`, `docs/rules/solid-require-cleanup.md`, `oxlint/README.md`, `oxlint/solid/README.md`, `oxlint/react/README.md`, the root `README.md`.
- Consumers: no change for a TypeScript or React repository. A Solid repository installs `@inflexa-ai/oxlint-plugin-solid` and calls `solid()`.
