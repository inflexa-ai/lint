# package-ci Specification

## Purpose

Every pull request runs the tests of the published packages and of the Go module, and a push to the default branch publishes the package whose version is new, through OIDC with no token in the repository.

## Requirements

### Requirement: Each pull request runs the package tests

The repository SHALL run `npm ci`, `npm run format:check`, `npm run lint` and `npm test` at `oxlint/` on Node 24 for each pull request, and SHALL run `test -z "$(gofmt -l .)"`, `go vet ./...` and `go test -count=1 ./...` at `golint/` with the Go version of `golint/go.mod` for each pull request, so a change that breaks a package, its self-lint or its format cannot merge without a run that shows it.

#### Scenario: A pull request runs the tests

- **WHEN** a pull request opens or gains a push
- **THEN** the workflow installs the workspace with `npm ci`, and runs `npm run format:check`, `npm run lint` and `npm test` at `oxlint/` on Node 24

#### Scenario: A pull request runs the Go checks

- **WHEN** a pull request opens or gains a push
- **THEN** the workflow sets up Go from `golint/go.mod` with the module cache keyed on `golint/go.sum`, and runs `test -z "$(gofmt -l .)"`, `go vet ./...` and `go test -count=1 ./...` at `golint/`

### Requirement: A new package version publishes with OIDC

A push to the default branch that changes a package manifest SHALL publish each package whose version is not yet on the npm registry. The publish job SHALL hold the `id-token: write` permission and no npm token, and SHALL let npm 11.5.1 or later take its identity from the OIDC of GitHub Actions.

#### Scenario: An unpublished version publishes

- **WHEN** a push to the default branch carries a package version that the registry does not have
- **THEN** the workflow publishes that package from its directory, with `id-token: write` and no stored token

#### Scenario: A published version publishes nothing

- **WHEN** a push to the default branch carries a version that the registry already has
- **THEN** the workflow skips the publish of that package and reports that the version is already published

### Requirement: Each workflow job runs on a GitHub-hosted runner

Each job of the test workflow and of the release workflows SHALL run on `ubuntu-latest`, and no job SHALL name a self-hosted runner, because a pull request from a fork runs its own code in the job. The test workflow SHALL keep the job names `Format, lint and test at oxlint/` and `Format, vet and test at golint/`, because a required check of a ruleset matches a job by its name.

#### Scenario: A pull request from a fork

- **WHEN** a pull request from a fork opens or gains a push
- **THEN** the jobs `Format, lint and test at oxlint/` and `Format, vet and test at golint/` run on a GitHub-hosted `ubuntu-latest` runner

#### Scenario: A release on the default branch

- **WHEN** a push to the default branch changes a package manifest or `golint/VERSION`
- **THEN** the release job of that package runs on a GitHub-hosted `ubuntu-latest` runner

### Requirement: The staged npm package names this repository and links each rule here

The npm release SHALL stage and publish `@inflexa-ai/typecheck`, `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/oxlint-plugin-solid` at one shared version, each package after the packages that it depends on. The release SHALL write the `repository` of the source manifest into each staged manifest, in a local run and in GitHub Actions. That `repository` SHALL name `git+https://github.com/inflexa-ai/lint.git` and the directory of the package under `oxlint/`. Each rule of a staged package SHALL keep the `meta.docs.url` of the source, which names the document of the rule that the `lint-rule-documentation` capability gives. A staged package SHALL hold `dist/`, `LICENSE`, its `NOTICE` when the source package has one, and its manifest, and no copy of the rule documents. The release SHALL run when a push to the default branch changes the manifest of any of these packages.

#### Scenario: A local dry run

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/` outside GitHub Actions
- **THEN** each staged `package.json` holds `repository` with the URL `git+https://github.com/inflexa-ai/lint.git` and the directory of that package, each rule in the staged `dist/` of the TypeScript and React packages and of `@inflexa-ai/typecheck` links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, each rule in the staged `dist/` of the Solid package links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/solid-<rule name>.md`, the staged packages of `@inflexa-ai/typecheck` and `@inflexa-ai/oxlint-plugin-react` hold `NOTICE`, and no staged package holds a `docs/` folder

#### Scenario: The dry run proves the command

- **WHEN** the dry run installs the tarballs into a scratch project with a type error and a type that resolves to `{}`
- **THEN** `inflexa-typecheck` in the scratch project prints the diagnostic and the report of `no-generated-empty-object-type`, and exits with status 1

### Requirement: Dependabot updates the dependencies of each package

`.github/dependabot.yml` SHALL hold a weekly update entry for `github-actions` at `/`, for `npm` at `/oxlint`, and for `gomod` at `/golint`.

#### Scenario: A new release of a dependency

- **WHEN** a dependency of `oxlint/package-lock.json` or of `golint/go.mod` gets a new release
- **THEN** Dependabot can open a pull request that updates it, with the same weekly schedule as the updates of the actions

### Requirement: The npm release covers each package of the workspace

`oxlint/scripts/release.mjs` SHALL release each package of the workspace at one shared version, and SHALL publish `@inflexa-ai/oxlint-plugin` before the packages that depend on it. The dry run SHALL build, stage and pack each package, install the tarballs into a scratch project, and run oxlint there with `react()` and with `solid()`. The run of `solid()` SHALL report a rule of `@inflexa-ai/oxlint-plugin` and a rule of `eslint-plugin-solid`, or the release stops. `.github/workflows/release-oxlint.yml` SHALL run when the manifest of a package of the workspace changes on the default branch.

#### Scenario: A dry run of the release

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/`
- **THEN** `.release/` holds a staged folder and a tarball at version `0.5.0` for `@inflexa-ai/typecheck`, `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/oxlint-plugin-solid`, the staged manifests of the React and Solid packages name `@inflexa-ai/oxlint-plugin` at exactly `0.5.0`, and the smoke run of `solid()` reports `no-interface` and a `solid/*` rule

#### Scenario: A change of the Solid manifest on the default branch

- **WHEN** a push to the default branch changes `oxlint/solid/package.json`
- **THEN** the release workflow runs
