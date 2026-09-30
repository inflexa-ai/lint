# oxlint

The packages of this workspace hold the lint rules of Inflexa. oxlint runs the
rules that read syntax. The command `inflexa-typecheck` runs the rules that read
types, together with the type check of `tsc --noEmit`. Each oxlint package also
installs the third-party plugins that it configures, thus one dependency gives a
repository the full set of oxlint rules.

| Package                           | For                                                                  | Third-party plugins                                                            |
| --------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `@inflexa-ai/oxlint-plugin`       | each TypeScript repository                                           | the ESLint rules of `oxlint-plugin-eslint`, and the native vitest rules        |
| `@inflexa-ai/oxlint-plugin-react` | each React repository, and it includes `@inflexa-ai/oxlint-plugin`   | TanStack Query and Router, Tailwind, React Doctor, Testing Library, Playwright |
| `@inflexa-ai/oxlint-plugin-solid` | each SolidJS repository, and it includes `@inflexa-ai/oxlint-plugin` | `eslint-plugin-solid`                                                          |
| `@inflexa-ai/typecheck`           | each TypeScript repository on TypeScript 7                           | none                                                                           |

oxlint runs the rules of ESLint, of typescript-eslint, and of React hooks and
React Refresh natively. It runs the typed rules of typescript-eslint through
tsgolint. It runs the rules of this repository and the other third-party
plugins, `eslint-plugin-solid` included, as JS plugins.

The TypeScript and React packages export the pieces that a repository applies
to its own zones: `vitest` for the test files, `tanstack` for the application
code, and `testingLibrary` and `playwright` for the component tests and the
end-to-end tests. React Doctor comes through the `reactDoctor` option of the `react`
factory. Its capability setting belongs to the root configuration, and oxlint
reads the settings of the root only.

Two parts of the lint cannot run in oxlint:

- The rules that read types: `must-use-result`, `require-abort-signal`,
  `no-generated-empty-object-type`, and the rules of the React plugin of
  `inflexa-typecheck`. oxlint gives a JS plugin no type information.
  `inflexa-typecheck` of `@inflexa-ai/typecheck` runs them on the program of
  TypeScript 7. Refer to [its README](./typecheck/README.md).
- The guard of the disable directives. oxlint has no processors, and a rule
  cannot guard the directive that switches it off.

The command `directive-guard` runs the guard. By default it guards the rules
whose names start with `@inflexa-ai/`. `--prefix` replaces that list, and
`--allow-inline` names a rule that a directive can switch off with a reason.

A repository installs `oxlint` and `oxlint-tsgolint` beside the oxlint package.
Pin `oxlint` and `oxlint-tsgolint` to exact versions, because JS plugins and
type-aware rules are not under semver.

The Tailwind and React Doctor plugins are optional peers. A repository that sets the `tailwind` option installs
`eslint-plugin-better-tailwindcss`. Its `restrict` list names the classes that
no component writes, and without the list no class is restricted. A repository
that sets the `reactDoctor` option installs `eslint-plugin-react-doctor`. The
repository then calls a factory in its own `oxlint.config.ts`:

```ts
import { vitest } from '@inflexa-ai/oxlint-plugin'
import { playwright, react, tanstack, testingLibrary } from '@inflexa-ai/oxlint-plugin-react'

export default react({
  reactDoctor: { files: ['apps/*/src/**', 'packages/*/src/**'] },
  tailwind: { entryPoint: 'src/app.css' },
  overrides: [
    { files: ['src/**'], ...tanstack },
    { files: ['**/*.test.{ts,tsx}'], ...vitest },
    { files: ['**/test/**/*.test.tsx'], ...testingLibrary },
    { files: ['e2e/**/*.ts'], ...playwright },
  ],
})
```

For the typed rules, the repository installs `@inflexa-ai/typecheck` and holds the two TypeScript aliases in its
`devDependencies`: `@typescript/native` at `npm:typescript@7.0.2` for `tsc` and `inflexa-typecheck`, and `typescript`
at `npm:@typescript/typescript6@^6.0.2` for the editors, which read TypeScript 6. The editors check with TypeScript 6,
while `tsc` and `inflexa-typecheck` check with TypeScript 7. The repository calls `typecheck()` in its own
`typecheck.config.ts`, and turns on each typed rule for the files that it guards:

```ts
import { plugin as react } from '@inflexa-ai/oxlint-plugin-react/typecheck'
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  plugins: [react],
  overrides: [{ files: ['src/**'], rules: { 'require-abort-signal': ['error', { declaredIn: ['/src/api/'] }] } }],
})
```

The lint of a repository runs the three tools in this sequence:

```sh
oxlint && inflexa-typecheck && directive-guard
```

`inflexa-typecheck` also gives the diagnostics of `tsc --noEmit`, thus it
replaces that step of the repository.

A Solid repository calls `solid()` in its `oxlint.config.ts`, and applies the
rules of the Solid plugin to its own folders:

```ts
import { vitest } from '@inflexa-ai/oxlint-plugin'
import { solid } from '@inflexa-ai/oxlint-plugin-solid'

export default solid({
  version: 1,
  overrides: [
    { files: ['src/**/*.tsx'], rules: { '@inflexa-ai/solid/require-cleanup': 'error', '@inflexa-ai/solid/no-raw-context': 'error' } },
    { files: ['src/contexts/factory.ts'], rules: { '@inflexa-ai/solid/no-raw-context': 'off' } },
    { files: ['**/*.test.{ts,tsx}'], ...vitest },
  ],
})
```

`solid()` turns on the rules of `eslint-plugin-solid/configs/typescript` and
`solid/prefer-show`. The `version` option writes `settings.solid.version` and
changes nothing else, thus a repository on Solid 2 turns on the rules of
`eslint-plugin-solid/configs/v2` in its own blocks. `solid()` keeps the timer
ban of `typescript()`. A repository that lets a component use `setInterval` sets
`syntax: { timers: false }`.

The factory gives the rules that apply to each file. The rules that depend on
the folder of a file, for example the rules for application code, apply only in
the blocks of the repository. A glob in a package cannot know the layout of each
repository.

Each tool reads its own form of directive. oxlint reads `oxlint-disable`
comments, and `inflexa-typecheck` reads `typecheck-disable-next-line` comments
only. No tool reads `eslint-disable`, and no tool reads the other typecheck
forms, `typecheck-disable` and `typecheck-disable-line`. `directive-guard`
reports each directive of the forms that no tool reads, and each directive of
the live forms that switches off a guarded rule. Each tool reports the unused
directives of its own form.

A message states the principle. When a rule points at a replacement, the
repository names its own module in the `hint` option of that rule.

The rules are written in TypeScript. `tsc` builds each package into `dist/`,
with no comments in the JavaScript and with the doc comments in the
declarations. The tests run on the TypeScript source, thus a test never runs
against an old build. The RuleTester of oxlint runs the tests of each rule that
reads only syntax. The rule tester of `@inflexa-ai/typecheck` runs the tests of
each typed rule.

Run each command from this folder, which is the root of the npm workspace:

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
```

`npm run lint` lints the packages with their own configuration: oxlint,
`inflexa-typecheck` over the tsconfig of each package and of this folder, and
`directive-guard`. It sets the `source` condition of Node.js, thus the
configuration loads the TypeScript source and not an old build. oxfmt formats
the workspace, with the settings in [`.oxfmtrc.json`](./.oxfmtrc.json).

`npm run lint` also runs jscpd with the settings in [`.jscpd.json`](./.jscpd.json).
jscpd fails when a block of code occurs in more than one place. Put an operation
that more than one module uses in a shared helper. Then import the helper.

## Release the npm packages

The packages share one version. The React and Solid packages depend on the
exact version of the TypeScript package, because they import its helpers. The
React package names the typecheck package at the same version as an optional
peer. To release, set the new version in the `package.json` file of each package
and merge the change into `main`. Then run the release from this folder:

```sh
node scripts/release.mjs            # a dry run
node scripts/release.mjs --publish  # publish, then tag oxlint-v<version>
```

The dry run changes nothing outside `.release/`. It runs the checks,
builds the packages, and stages a clean folder for each package in
`.release/`. A staged package holds `dist/`, `LICENSE`, `NOTICE` when the
package has one, and a `package.json` with no scripts, no development
dependencies, and no `source` condition. The dry run then installs the tarballs
into a scratch project. It runs oxlint, `inflexa-typecheck` and
`directive-guard` with them.

`--publish` also publishes each package that npm does not have at that
version, each package after the packages that it depends on: the typecheck
package, then the TypeScript package, then the React package. Then it tags the
commit as `oxlint-v<version>`. It stops unless the working tree is clean and
`HEAD` is `origin/main`. A run that stopped halfway can run again. Each rule
links to its document in [`docs/rules/`](../docs/rules/).

The workflow `release-oxlint.yml` runs the same script on `main` when a version
changes. It uses npm trusted publishing, and npm accepts a trusted publisher
only for a package that exists. Thus the first release of each package is
local. Before the workflow can publish, add the workflow as a trusted publisher
of each package on npmjs.com.