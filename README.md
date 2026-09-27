# lint

The shared lint rules of Inflexa, for TypeScript, React and Go.

<a href="https://scorecard.dev/viewer/?uri=github.com/inflexa-ai/lint"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/inflexa-ai/lint/badge" /></a>
<a href="./LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" /></a>

## oxlint

Two packages hold the lint rules of Inflexa. oxlint runs them. Each package also
installs the third-party plugins that it configures, thus one dependency gives a
repository the full set.

| Package | For | Third-party plugins |
| --- | --- | --- |
| `@inflexa-ai/oxlint-plugin` | each TypeScript repository | the ESLint rules of `oxlint-plugin-eslint`, and the native vitest rules |
| `@inflexa-ai/oxlint-plugin-react` | each React repository, and it includes the package above | TanStack Query and Router, Tailwind, React Doctor, Testing Library, Playwright |

oxlint runs the rules of ESLint, of typescript-eslint, and of React hooks and
React Refresh natively. It runs the typed rules of typescript-eslint through
tsgolint. It runs the rules of this repository and the other third-party
plugins as JS plugins.

Each package exports the pieces that a repository applies to its own zones:
`vitest` for the test files, `tanstack` for the application code, and
`testingLibrary` and `playwright` for the component tests and the end-to-end
tests. React Doctor comes through the `reactDoctor` option of the `react`
factory. Its capability setting belongs to the root configuration, and oxlint
reads the settings of the root only.

Three parts of the lint cannot run in oxlint yet:

- The rules that read types: `require-abort-signal` and `no-inline-query-key`.
  oxlint gives a JS plugin no type information. Without it, each rule stops the
  run with an error.
- `@typescript-eslint/no-generated-empty-object-type`. tsgolint does not have it
  in a release yet.
- The guard of the disable directives. oxlint has no processors, and a rule
  cannot guard the directive that switches it off.

ESLint runs the first two parts, through the `./eslint` export of each package.
The command `inflexa-architecture-directives` runs the guard.

A repository installs `oxlint`, `oxlint-tsgolint`, `eslint`, and `typescript`
beside the package. Pin `oxlint` and `oxlint-tsgolint` to exact versions,
because JS plugins and type-aware rules are not under semver. The Tailwind and
React Doctor plugins are optional peers. A repository that sets the `tailwind`
option installs `eslint-plugin-better-tailwindcss`, and a repository that sets
the `reactDoctor` option installs `eslint-plugin-react-doctor`. The repository
then calls a factory in its own `oxlint.config.ts`:

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

The repository also calls a factory in its own `eslint.config.js`, and applies
each typed rule to the files that it guards:

```js
import { react } from '@inflexa-ai/oxlint-plugin-react/eslint'

export default [
  ...react({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/**/*.ts'],
    rules: { '@inflexa-ai/require-abort-signal': ['error', { declaredIn: ['/src/api/'] }] },
  },
]
```

The lint of a repository runs the three tools in this sequence:

```sh
oxlint && eslint . && inflexa-architecture-directives
```

The factory gives the rules that apply to each file. The rules that depend on
the folder of a file, for example the rules for application code, apply only in
the blocks of the repository. A glob in a package cannot know the layout of each
repository.

oxlint reads `oxlint-disable` comments, and ESLint reads `eslint-disable`
comments. Thus a directive for an oxlint rule is an `oxlint-disable`, and a
directive for a typed rule is an `eslint-disable`. Each tool reports the unused
directives of its own form.

A message states the principle. When a rule points at a replacement, the
repository names its own module in the `hint` option of that rule.

The rules are written in TypeScript. `tsc` builds each package into `dist/`,
with no comments in the JavaScript and with the doc comments in the
declarations. The tests run on the TypeScript source, thus a test never runs
against an old build. oxlint runs the tests of each rule that reads only syntax,
and ESLint runs the tests of each typed rule.

Run each command from `oxlint/`, which is the root of the npm workspace:

```sh
cd oxlint
npm install
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
```

`npm run lint` lints the packages with their own configuration. It sets the
`source` condition of Node.js, thus the configuration loads the TypeScript
source and not an old build. oxfmt formats the workspace, with the settings in
`oxlint/.oxfmtrc.json`.

The root of this repository holds no npm tooling. Each topic keeps its own
tooling in its own directory.

### Release the npm packages

The two packages share one version. The React package depends on the exact
version of the TypeScript package, because it imports its helpers. To release,
set the new version in both `package.json` files and merge the change into
`main`. Then run the release from `oxlint/`:

```sh
node scripts/release.mjs            # a dry run
node scripts/release.mjs --publish  # publish, then tag oxlint-v<version>
```

The dry run changes nothing outside `oxlint/.release/`. It runs the checks,
builds the packages, and stages a clean folder for each package in
`.release/`. A staged package holds `dist/`, `LICENSE`, and a `package.json`
with no scripts, no development dependencies, and no `source` condition. The
dry run then installs the tarballs into a scratch project and runs oxlint with
them.

`--publish` also publishes each package that npm does not have at that
version, the TypeScript package first. Then it tags the commit as
`oxlint-v<version>`. It stops unless the working tree is clean and `HEAD` is
`origin/main`. A run that stopped halfway can run again. Each rule links to its
document in `docs/rules/` of this repository.

The workflow `release-oxlint.yml` runs the same script on `main` when a version
changes. It uses npm trusted publishing, and npm accepts a trusted publisher
only for a package that exists. Thus the first release of each package is
local. Before the workflow can publish, add the workflow as a trusted publisher
of each package on npmjs.com.

## golint

The Go module `github.com/inflexa-ai/lint/golint` holds the lint rules of
Inflexa for Go. It has these parts:

- One `go/analysis` analyzer for each rule. `docs/rules/<analyzer>.md` gives the
  principle and the settings of each analyzer.
- One golangci-lint module plugin for each analyzer, under the name of the
  analyzer.
- `inflexa-lint`, which is golangci-lint v2.14.0 with the plugins compiled in.
- `inflexa-lint-config`, which writes the golangci-lint configuration into a
  repository.

A release of the module is a tag `golint/vX.Y.Z`, and `go get` names it as
`vX.Y.Z`. A repository takes the two commands as tools in a separate module
file, `tools/go.mod`:

```sh
mkdir tools
go mod init -modfile=tools/go.mod example.com/svc/tools
go get -modfile=tools/go.mod -tool github.com/inflexa-ai/lint/golint/cmd/inflexa-lint@v0.1.0
go get -modfile=tools/go.mod -tool github.com/inflexa-ai/lint/golint/cmd/inflexa-lint-config@v0.1.0
```

The separate file keeps the dependencies of golangci-lint out of the `go.mod`
of the repository. `go tool -modfile=tools/go.mod inflexa-lint version` prints
the two versions, for example `v2.14.0+golint.v0.1.0`. golangci-lint uses this
string in the key of its cache, thus a new release of the rules clears the old
issues.

golangci-lint reads one configuration file, and it has no `extends`. Thus
`inflexa-lint-config` writes two files into the repository from the base in
this module:

- `.golangci.yml`, with the module path of the repository in each import path,
  and the names of the typed IDs of the repository for `typedids`.
- `golangci/rules.go`, the ruleguard patterns that gocritic loads.

`inflexa-lint-config` loads the typed ID package of the repository, and
writes the names into `.golangci.yml`. The names are part of the key of the
lint cache, thus a new typed ID makes golangci-lint analyze each package again.
Run `inflexa-lint-config` again after a change of the typed IDs.

Commit both files. Put the local choices of the repository in
`golangci/overlay.yml`, for example `issues.new-from-merge-base` or more
exclusion rules. The overlay merges into the base with these rules:

- A mapping merges by key.
- A list of the overlay comes after the list of the base.
- Each other value of the overlay replaces the value of the base.

An overlay cannot remove an entry of the base.

```sh
go tool -modfile=tools/go.mod inflexa-lint-config
go tool -modfile=tools/go.mod inflexa-lint run ./...
```

In CI, run `inflexa-lint-config -check`. It writes nothing, and it prints each
file that differs from the base and the overlay. It exits with status 1 when a
file differs.

The ruleguard patterns work only when the `go.mod` of the repository requires
`github.com/quasilyte/go-ruleguard/dsl`. Run `go get github.com/quasilyte/go-ruleguard/dsl`
one time. Without the module, the lint run stops with an error, because a
silent skip hides each pattern. `golangci/rules.go` starts with
`//go:build ruleguard`. Thus no build, test or vet reads the file, but
`go mod tidy` sees its import and keeps the requirement.

Each rule is its own linter, thus a directive can stop one rule:

```go
if strings.Contains(err.Error(), "not a member") { //nolint:errtext // the module exports no sentinel yet
```

nolintlint rejects a directive with no reason, and a directive that suppresses
nothing.

Run each command of the module from `golint/`:

```sh
cd golint
gofmt -l .
go vet ./...
go test ./...
```

The tests of `config/` build `inflexa-lint` and run it on a fixture module. The
first build of golangci-lint takes some minutes.

### Release the Go module

`golint/VERSION` holds the version of the module. To release, set the new
version in that file and merge the change into `main`. Then run the release
from the root of the repository:

```sh
golint/scripts/release.sh         # a dry run
golint/scripts/release.sh --push  # tag golint/v<version> and push the tag
```

The dry run runs `gofmt`, `go vet`, the tests and the build, and changes
nothing. `--push` stops unless the working tree is clean and `HEAD` is
`origin/main`. The workflow `release-golint.yml` runs the same script on `main`
when `golint/VERSION` changes.

## Contribute

Read [CONTRIBUTING.md](./CONTRIBUTING.md). To report a vulnerability, obey [SECURITY.md](./SECURITY.md).

## License

This repository uses the Apache License 2.0. Refer to [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
