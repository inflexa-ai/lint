# solid-plugin Specification

## Purpose

The package `@inflexa-ai/oxlint-plugin-solid` gives a SolidJS repository of Inflexa one oxlint configuration with the rules of `typescript()` and of `eslint-plugin-solid`. It also holds the Solid rules of this repository, which a repository turns on in its own blocks.

## Requirements

### Requirement: The Solid package installs the Solid plugin and no React plugin

`oxlint/solid/package.json` SHALL name the package `@inflexa-ai/oxlint-plugin-solid`, with the version of the other packages of the workspace. It SHALL list `@inflexa-ai/oxlint-plugin` and `eslint-plugin-solid` as dependencies, and SHALL NOT list a React, TanStack, Testing Library or Playwright plugin. The package SHALL export `solid()` and `plugin` from its main entry, and the plugin as the default export of its `./plugin` entry.

#### Scenario: The manifest of the Solid package

- **WHEN** a reader opens `oxlint/solid/package.json`
- **THEN** its version equals the version of `oxlint/typescript/package.json`, which is `0.5.0`, its `dependencies` hold `@inflexa-ai/oxlint-plugin` at `^0.5.0` and `eslint-plugin-solid`, and no entry of `dependencies` or `peerDependencies` names `react`, `@tanstack/`, `testing-library` or `playwright`

### Requirement: solid() adds the Solid rules to the configuration of typescript()

`solid(options)` SHALL accept each option of `typescript()` and SHALL return the configuration of `typescript()` for those options, with these additions:

- The plugin of the package and `eslint-plugin-solid` in `jsPlugins`, each as an absolute path that the package resolves from its own location.
- A block for `**/*.{ts,tsx}` that turns on each rule of `eslint-plugin-solid/configs/typescript` with the severity and the options of that configuration, and `solid/prefer-show` as an error.
- The blocks of the `overrides` option, after the blocks of the package.

`solid()` SHALL NOT turn on a rule of `@inflexa-ai/solid/`, SHALL NOT add an environment, and SHALL NOT name a rule of the native `react` plugin of oxlint.

#### Scenario: The rules of the Solid configuration

- **WHEN** a repository calls `solid()`
- **THEN** `jsPlugins` holds the absolute path of `eslint-plugin-solid` and of the plugin of the package, and a block for `**/*.{ts,tsx}` holds each rule of `eslint-plugin-solid/configs/typescript` with its severity and options, and `solid/prefer-show` as `error`

#### Scenario: The rules of the package stay off

- **WHEN** a repository calls `solid()` without overrides
- **THEN** no block turns on a rule whose name starts with `@inflexa-ai/solid/`, no block names a rule that starts with `react/`, and `env` equals the `env` of `typescript()`

#### Scenario: A repository applies a rule of the package

- **WHEN** a repository calls `solid({ overrides: [{ files: ['src/**'], rules: { '@inflexa-ai/solid/require-cleanup': 'error' } }] })`
- **THEN** that block comes after each block of the package

#### Scenario: oxlint gives the reports of ESLint

- **WHEN** oxlint lints a copy of the TypeScript and TSX source of a Solid repository with the configuration of `solid()`, and ESLint lints the same files with `eslint-plugin-solid/configs/typescript` of the same plugin version, with no inline configuration on either side
- **THEN** each `solid/*` report of ESLint appears in the output of oxlint with the same file, line, column and rule

### Requirement: The version option sets the Solid version

`solid({ version })` SHALL accept `1` or `2`, and SHALL write the value to `settings.solid.version` of the root configuration. Without the option, the configuration SHALL hold no `solid` key in `settings`. The option SHALL change the settings only: the rule set stays the rules of `eslint-plugin-solid/configs/typescript` for each value, and a repository on Solid 2 turns on the rules of `eslint-plugin-solid/configs/v2` in its own blocks.

#### Scenario: oxlint hands the version to eslint-plugin-solid

- **WHEN** oxlint lints `createEffect(() => read(), [dependency])` once with `solid({ version: 1 })` and once with `solid({ version: 2 })`
- **THEN** `settings` holds `{ solid: { version: 1 } }` and `{ solid: { version: 2 } }`, and oxlint reports `solid/no-react-deps` in the first run only, because the rule is off for Solid 2

#### Scenario: A repository that names no version

- **WHEN** a repository calls `solid()`
- **THEN** `settings` holds no `solid` key

### Requirement: no-raw-context bans the context primitives of solid-js

`@inflexa-ai/solid/no-raw-context` SHALL report each way a file gets hold of `createContext` or `useContext` of the module `solid-js`: a named import, also under a different local name; a re-export; a member access on a namespace import; a destructure of a namespace import, also with a computed key that is a string literal; and `export *` from `solid-js`. It SHALL NOT report a type-only import or re-export (a type-only declaration or a type-only specifier), a name from another module, a member access or a destructure of a local binding that shadows the namespace import, or a dynamic `import('solid-js')`. The option `names` SHALL replace the list of banned exports, and the option `hint` SHALL add a sentence to the end of the message. The message SHALL name the export and the module `solid-js`. A repository turns the rule off for the files of its context factory.

#### Scenario: A named import under an alias

- **WHEN** a file holds `import { createContext as make } from 'solid-js'`
- **THEN** the rule reports `createContext` from `solid-js`

#### Scenario: A namespace import

- **WHEN** a file holds `import * as Solid from 'solid-js'` and reads `Solid.useContext`
- **THEN** the rule reports `useContext` from `solid-js`

#### Scenario: A binding that shadows the namespace import

- **WHEN** a file holds `import * as Solid from 'solid-js'` and a function with a parameter named `Solid` reads `Solid.useContext`
- **THEN** the rule reports nothing

#### Scenario: The same name from React

- **WHEN** a file holds `import { createContext } from 'react'`
- **THEN** the rule reports nothing

#### Scenario: A hint of the repository

- **WHEN** the rule has the option `hint: 'Use createStrictContext from @acme/context.'` and a file imports `useContext` from `solid-js`
- **THEN** the message ends with `Use createStrictContext from @acme/context.`

### Requirement: require-cleanup asks for onCleanup beside a subscription in a component body

`@inflexa-ai/solid/require-cleanup` SHALL report a subscription call whose nearest enclosing function is a component, when no call of `onCleanup` of `solid-js` has that same function as its nearest enclosing function.

- A component is a function whose own name, or the name of the variable that it initializes, starts with an uppercase letter, or a function that returns JSX (an arrow with a JSX body, or a `return` of JSX among the statements of its block). A component nested in another component is a component of its own.
- A subscription call is a call of a member named `on`; a call of `addEventListener`, as the global or as a member; or a call of `setInterval`, as the global or as a member. A call of the member `on` of a namespace import of `solid-js` is the helper `on` of Solid and not a subscription.
- A call of `onCleanup` is a call whose callee resolves to the binding of a named import of `onCleanup` from `solid-js`, under any local name, or a call of the member `onCleanup` of the binding of a namespace import of `solid-js`. A local binding that shadows the import is not `onCleanup`.

One `onCleanup` call satisfies each subscription of the same function, and the rule does not read what the cleanup does. The rule SHALL NOT report a subscription inside a nested function that is not itself a component (an effect, an `onMount` callback, a `ref` callback, an event handler), a subscription in a function that is not a component, a subscription at module scope, or a call of a local binding named `setInterval` or `addEventListener`. The rule has no options.

#### Scenario: A listener with no cleanup

- **WHEN** a file holds `function Sidebar() { Bus.on('inflexa', handle); return <box /> }`
- **THEN** the rule reports the `Bus.on` call

#### Scenario: A timer with its cleanup

- **WHEN** a file holds `const Spinner = () => { const timer = setInterval(tick, 80); onCleanup(() => clearInterval(timer)); return <text /> }`, and `onCleanup` comes from `solid-js`
- **THEN** the rule reports nothing

#### Scenario: A cleanup in a different function

- **WHEN** a component calls `window.addEventListener('resize', fit)` in its body, and its only `onCleanup` call sits inside an `onMount` callback
- **THEN** the rule reports the `addEventListener` call

#### Scenario: A subscription inside a nested callback

- **WHEN** a component passes `ref={(r) => { r.on('focused', focus) }}`, and the `ref` callback holds no `onCleanup`
- **THEN** the rule reports nothing

#### Scenario: A render callback that subscribes

- **WHEN** a component holds `<For each={rows()}>{(row) => { const timer = setInterval(tick, 1000); return <text /> }}</For>`, and the callback holds no `onCleanup`
- **THEN** the rule reports the `setInterval` call, because the callback returns JSX and is a component

#### Scenario: A local binding that shadows onCleanup

- **WHEN** a file imports `onCleanup` from `solid-js`, and a component declares `const onCleanup = (): void => {}`, calls `Bus.on('inflexa', handle)` and calls its local `onCleanup()`
- **THEN** the rule reports the `Bus.on` call

#### Scenario: A function that is not a component

- **WHEN** a file holds `export async function warmGrammars() { client.on('error', ignore) }`
- **THEN** the rule reports nothing
