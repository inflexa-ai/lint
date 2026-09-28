# Design

## Context

See proposal.md for the motivation. The workspace `oxlint/` holds the TypeScript package and the React package. `react()` spreads `typescript()`, adds its own JS plugin and third-party JS plugins as absolute paths (`oxlint/react/src/index.ts:13-15,144-197`), and turns on none of its own rules: a repository applies them in its own blocks. The React bans of raw state, effect and context come from `oxlint/react/src/helpers/react-primitive-ban.ts`, which compares each module specifier with `'react'`.

`eslint-plugin-solid` 0.18.0 exports `configs/typescript` (the recommended rules, `jsx-no-undef` with `typescriptEnabled`, and `no-unknown-namespaces` off) and reads `settings.solid.version` (`src/utils.ts` `getSolidVersion`). A probe with oxlint 1.85.0 and 0.18.0 in `tmp/claude/probe/` showed that oxlint runs the plugin under the name `solid`, and that it hands the root `settings` to it: `solid/no-react-deps` reported `createEffect(fn, [a])` with `version: 1` and stayed quiet with `version: 2`. The cli of `inflexa-ai/inflexa` uses 0.14.5, which declares ESLint `^9` at most as a peer. The first release that accepts ESLint 10 is 0.15.0.

## Goals / Non-Goals

**Goals:**

- A Solid package that gives the `solid/*` reports of ESLint under oxlint, with no React plugin in its install.
- One ban helper for React and Solid, owned by the TypeScript package.

**Non-Goals:**

- The rules for the opentui renderer, `no-raw-text` and the TanStack rules (issue scope).
- An `./eslint` entry for the Solid package. It has no typed rule. A Solid repository runs the typed rules of the TypeScript package through `@inflexa-ai/oxlint-plugin/eslint`.
- A check of subscriptions inside effects, `onMount`, `ref` callbacks, event handlers and hooks (see the `require-cleanup` decision).

## Decisions

### The ban helper moves to the TypeScript package as primitive-ban

`oxlint/typescript/src/helpers/primitive-ban.ts` exports `createPrimitiveBan({ description, module, names, guidance, url })` and the type `PrimitiveBan`. It compares each specifier with `module` exactly. The messages take the module at construction: `` `{{name}}` from <module> is not available here. <guidance>{{hint}} `` and `Re-exporting everything from <module> hands out the primitives this rule bans. Export the specific names instead.` Thus the `data` of a report stays `{ name, hint }`, and the React messages keep their text. The doc comment of the helper names "the module" instead of react. The React rules import it through the `./helpers/*` export of `@inflexa-ai/oxlint-plugin`, and `oxlint/react/src/helpers/react-primitive-ban.ts` goes away. The React test `react-primitive-ban.test.ts` stays as it is and proves that the move changes nothing.

Alternatives: keep the name `react-primitive-ban`, rejected because the helper serves any module; let the Solid package import the helper from the React package, rejected because the Solid package then installs the React plugins.

### The Solid package mirrors the React package

`oxlint/solid/` holds `LICENSE`, `README.md`, `package.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, and `src/` with `index.ts`, `plugin.ts`, `js-plugin.ts`, `rules/`, `rules/test/` and `test/`, as the React package does. The manifest:

- `name` `@inflexa-ai/oxlint-plugin-solid`, `version` `0.4.0` (the shared version), the `repository.directory` `oxlint/solid`.
- `exports`: `.`, `./plugin` and `./package.json`, with the `source`, `types` and `default` conditions of the React package.
- `dependencies`: `@inflexa-ai/oxlint-plugin` `^0.4.0`, `@typescript-eslint/utils` `^8.70.1`, `eslint-plugin-solid` `^0.18.0`.
- `peerDependencies`: `eslint`, `oxlint`, `oxlint-tsgolint` and `typescript`, with the ranges of the TypeScript package.

`plugin.ts` sets `NAMESPACE = '@inflexa-ai/solid'` and `meta.name` `@inflexa-ai/oxlint-plugin-solid`. oxlint then names the rules `@inflexa-ai/solid/<rule>`, as it names the React rules `@inflexa-ai/react/<rule>`. `oxlint/package.json` lists `solid` in `workspaces`, and `oxlint/oxlint.config.ts` adds `solid/src/plugin.ts` to the files that bridge the rule types.

The README of the package names the install: `@inflexa-ai/oxlint-plugin-solid`, `@inflexa-ai/oxlint-plugin` (a Solid repository imports `@inflexa-ai/oxlint-plugin/eslint` and `vitest` from it, and runs its `directive-guard`), `oxlint`, `oxlint-tsgolint`, `eslint` and `typescript`.

`eslint-plugin-solid` is `^0.18.0` because the workspace and each consumer run ESLint 10, and npm refuses 0.14.5 beside it. The cli moves from 0.14.5 to 0.18.x with the package. The comparison task measures the reports of both versions.

### solid() follows react()

```ts
export type SolidOptions = TypescriptOptions & { version?: 1 | 2 }
export function solid({ version, overrides = [], ...options }: SolidOptions = {}): OxlintConfig
```

`solid()` calls `typescript(options)` and returns its configuration with:

- `jsPlugins`: the paths of `typescript()`, then `@inflexa-ai/oxlint-plugin-solid/plugin` and `eslint-plugin-solid`, each resolved with `import.meta.resolve` from the package.
- `settings`: `{ ...base.settings, solid: { version } }` when `version` is set, else the settings of `typescript()`. oxlint reads settings from the root configuration only.
- `overrides`: the blocks of `typescript()`, then `{ files: ['**/*.{ts,tsx}'], rules: { ...configs/typescript rules, 'solid/prefer-show': 'error' } }`, then the blocks of the repository.

The rules of `configs/typescript` go in as the configuration writes them, with numeric severities, which the oxlint rule type accepts. Its `plugins` object is not used, because oxlint loads the plugin from `jsPlugins`.

`solid/prefer-show` is an error. The issue asks for the rule, and the factories of this repository give `error` to each rule that they add, as `typescript()` does for its own rules. The rules of `configs/typescript` keep the severities that the plugin gives them, `warn` included. Alternative: `warn`, as the plugin marks its style rules, rejected because the rule is a choice of this repository and not of the plugin.

`solid()` adds no environment. The first consumer is a terminal UI, and a web repository passes `env: { browser: true }`. It turns on no rule of `@inflexa-ai/solid/`, as `react()` turns on none of its own: the repository names the files of its UI and exempts the file of its context factory.

`version` takes `1 | 2`, the majors that `eslint-plugin-solid` knows. The compiler then refuses a value that the plugin ignores in silence, for example `1.9`. The option changes the settings only. With `version: 2`, the version-aware rules of `configs/typescript` use the Solid 2 semantics, but the rules that only `configs/v2` turns on (for example `solid/removed-api` and `solid/no-single-arg-create-effect`) stay off. A repository on Solid 2 turns them on in its own blocks, and the README of the package says so. Alternative: the rules of `configs/v2` for `version: 2`, rejected because the issue names `configs/typescript` and no consumer runs Solid 2.

### no-raw-context for Solid

`oxlint/solid/src/rules/no-raw-context.ts` calls `createPrimitiveBan` with `module: 'solid-js'` and `names: ['createContext', 'useContext']`. The React reason (a context re-renders each consumer) does not apply to Solid. The Solid reason: a context factory of the repository owns each context. It makes the provider and one consumer function, and that function states what happens with no provider above it. A raw `useContext` gives `undefined` there, and each call site decides again. The cli shows the drift: `src/tui/contexts/workspace.ts:155` throws and `src/tui/components/dialog/dialog_host.tsx:213` falls back to `null`.

### require-cleanup reads the component body only

The rule works on syntax:

- **Component.** A function is a component when its name starts with an uppercase letter (a function declaration, a named function expression, or a function that initializes a variable), or when it returns JSX (an arrow with a JSX body, or a `return` of JSX among the statements of its block). This follows the test of `prefer-onSettled-for-side-effects` in `eslint-plugin-solid` 0.18, but it also reads the variable name of a named function expression, as the spec asks: `const Status = function helper() {}` is a component. A nested function that passes the test, for example a render callback of `<For>`, is a component of its own, and its subscriptions need an `onCleanup` in its own body.
- **Subscription.** A call whose callee is a member named `on`, `addEventListener` or `setInterval` (through `staticMemberName`), or a bare call of `addEventListener` or `setInterval` that `isGlobalIdentifier` resolves to the global. Both helpers come from `@inflexa-ai/oxlint-plugin/helpers/static-names`.
- **Cleanup.** A call whose callee identifier resolves, through the scope of the call, to the binding of a named import of `onCleanup` from `solid-js`, or a call of the member `onCleanup` of an identifier that resolves to a namespace import of `solid-js`. A local binding that shadows the import does not count. Scope resolution also makes the position of the import irrelevant.
- **Scope.** The nearest enclosing function of the call, through the `parent` chain. The rule records subscriptions and cleanups for each component and reports at the exit of the component each subscription of a component with no cleanup.
- **Report.** The subscription call, with the callee text in the message. The rule has no options.

The rule stops at the component body. That is the text of the issue ("in a component body ... in the same scope"), the rule of the cli (`cli/CLAUDE.md:797-798`, "Subscribe in the component setup ... Always pair it with onCleanup"), and the scope of `prefer-onSettled-for-side-effects`. Nested functions have owners that differ: an effect runs again and needs its own cleanup, an element owns the listeners of its `ref` callback, and an event handler runs with no owner. One rule for all of them reports correct code, for example `onMount(() => addEventListener(...))` beside a `onCleanup` in the body, and the `r.on(...)` calls in the `ref` callbacks of `text_area.tsx` and `text_input.tsx` of the cli. The document names these cases as out of reach.

Alternative: check each function inside a component. Rejected for the false reports above.

One `onCleanup` call satisfies each subscription of its function, and the rule does not read the body of the cleanup. The issue asks for "an `onCleanup` in the same scope", and the cli ends more than one subscription in one cleanup (`src/tui/hooks/profile_parity.ts:266-270`). A pairing of each subscription with its own cleanup needs dataflow that a syntax rule does not have. The document names the limit.

`typescript()` bans each raw timer by default (`eslint-js/no-restricted-syntax`, the `timers` entry of `restrictedSyntax`). Under that ban, a `setInterval` gets a report whether or not an `onCleanup` ends it. `solid()` keeps the ban, because the issue lists what `solid()` adds and the ban is not in the list. The document of `require-cleanup` and the README of the package say that a repository that allows timers in a component switches the ban off with `syntax: { timers: false }` or scopes it in its own blocks.

### The Solid documents carry the prefix solid-

The rule ids stay parallel to the React rules (`@inflexa-ai/solid/no-raw-context` beside `@inflexa-ai/react/no-raw-context`), and the documents take the prefix: `docs/rules/solid-no-raw-context.md` and `docs/rules/solid-require-cleanup.md`. `meta.docs.url` names the prefixed document, and the documentation test of the Solid package builds `solid-<rule name>.md`. Alternative: a rule id that repeats the framework, `@inflexa-ai/solid/no-raw-solid-context`. Rejected, because the issue asks for distinct document names and the id then names Solid two times.

### The shared version moves to 0.4.0

`@inflexa-ai/oxlint-plugin@0.3.0` and `@inflexa-ai/oxlint-plugin-react@0.3.0` are on npm, and the tag `oxlint-v0.3.0` exists. The published TypeScript package has no `dist/helpers/primitive-ban.js`. `release.mjs` writes the exact shared version into each dependency on a package of the workspace (`oxlint/scripts/release.mjs:105`), and it skips a version that npm has. Thus a React or Solid package at 0.3.0 would pin the published TypeScript package and fail to load the helper, and the smoke test would not see it, because it installs the local tarballs. The TypeScript, React and Solid manifests move to `0.4.0`, and the React and Solid dependency ranges on `@inflexa-ai/oxlint-plugin` become `^0.4.0`. The user chose this. The change for issues 8-11 moved the version in the same way.

### The release adds the Solid package

`PACKAGES` becomes `['typescript', 'react', 'solid']`, thus the TypeScript package still publishes first. The version check and the rewrite of `@inflexa-ai/oxlint-plugin` to the exact version already cover each entry. The smoke project gains a second configuration that default-exports `solid()` with `typeAware: false`, and a TSX file that breaks a rule of `eslint-plugin-solid`. `oxlint -c <file>` runs it, and the release stops unless the output holds `@inflexa-ai(no-interface)` and a `solid(` report. The workflow adds `oxlint/solid/package.json` to its paths, and its header stops naming the packages one by one.

## Risks / Trade-offs

- [The merge into `main` runs the release workflow, which publishes the TypeScript and React packages at 0.4.0 and then fails at the OIDC publish of the Solid package, which does not exist on npm] → The first publish of `@inflexa-ai/oxlint-plugin-solid` is local, as `oxlint/README.md` already states for each new package. A local `node scripts/release.mjs --publish` on `main` skips the packages that npm has, publishes the Solid package, and tags `oxlint-v0.4.0`. Then a person adds the workflow as a trusted publisher of the package.
- [`eslint-plugin-solid` 0.18 reports differently from the 0.14.5 of the cli] → The comparison task runs 0.14.5 and 0.18.0 on the same copy of the cli and records each difference with its cause.
- [`require-cleanup` misses a subscription in an effect or a hook] → The document says so. A later rule can cover effects when a case shows the need.
- [A `.on(...)` of an object that is not an emitter, for example a builder method] → The rule reads no types. The repository turns the rule off for that file, with the reason.
