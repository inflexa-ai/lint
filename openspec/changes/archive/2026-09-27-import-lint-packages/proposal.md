# Proposal

## Why

The lint packages lived in a private repository. A private Go module cannot serve a public consumer, because a pull request from a fork gets no secret to read the module, and npm gives provenance only to a package from a public repository. This change imports the packages into this public repository and removes what existed only because the source was private: its name, the facts of one consumer in the Go defaults, and the release steps for a private repository.

## What Changes

- Import `oxlint/`, `golint/`, `docs/rules/`, the test workflow, the release workflow of each package, and the root `.gitignore`, `.gitattributes` and `.editorconfig` from the private source repository. The lint specs arrived before this change, with neutral Purpose lines, and this change modifies them.
- Add a README section for each package: `oxlint` and `golint`, each with its release steps.
- **BREAKING** The Go module path becomes `github.com/inflexa-ai/lint/golint`. A consumer changes its import paths and its tool paths.
- Each rule links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule>.md`: `meta.docs.url` of each TypeScript rule, `URL` of each Go analyzer, and `original-url` of each plugin entry of the golangci-lint base configuration. The `repository` of each npm manifest names `inflexa-ai/lint`.
- **BREAKING** The golangci-lint base configuration holds no fact of one consumer repository: no `keyowner` key, no `rawhttp` client package, and no exclusion path for the commands of that repository. A consumer that needs them adds them in its `golangci/overlay.yml`.
- The test data and the spec examples use neutral names in place of the names of the former consumer.
- The npm release keeps the `meta.docs.url` of the source, stages no copy of the rule documents, always writes the `repository` of the source manifest into the staged manifest, and has no check for the name of the private repository.
- Each workflow job runs on a GitHub-hosted runner (`ubuntu-latest`), because a public repository must not run the code of a fork on a self-hosted runner.
- Dependabot also updates the npm dependencies at `/oxlint` and the Go dependencies at `/golint`.

## Capabilities

### New Capabilities

None. The lint specs arrive with the packages, and the deltas below change them.

### Modified Capabilities

- `go-analyzers`: the module path, and neutral names in the examples of `keyowner`, `rawhttp` and `testplacement`.
- `go-lint-plugins`: a neutral module path in the settings example.
- `golangci-configuration`: the base configuration holds no fact of one consumer repository, and the tuned-set requirement names no scratch file.
- `lint-rule-documentation`: the document URL names this repository.
- `package-ci`: GitHub-hosted runners, the staged npm manifest and its document links, and Dependabot for each package.

## Impact

- Code: each Go import path, `golint/go.mod`, the version string of `inflexa-lint`, each rule URL and the tests that assert it, `golint/config/golangci.base.yml`, test data of `keyowner`, `rawhttp`, `testplacement`, `typedids`, `plugin` and `config`, `oxlint/scripts/release.mjs`, the npm manifests.
- CI: `.github/workflows/test.yml`, `release-oxlint.yml`, `release-golint.yml`, `.github/dependabot.yml`.
- Documents: `README.md`, `docs/rules/keyowner.md`, `rawhttp.md`, `notfoundguard.md` and `testplacement.md`.
- Consumers: a Go consumer takes the new module path and moves its own keys, client packages and command exclusions into its overlay. A published npm package links each rule to its document on GitHub, and its tarball holds no copy of the documents.
