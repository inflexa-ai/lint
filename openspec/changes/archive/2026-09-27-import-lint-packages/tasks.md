# Tasks

## 1. Import

- [x] 1.1 Copy the files that git tracks at the source HEAD for `oxlint/`, `golint/` and `docs/rules/`, and the root `.gitignore`, `.gitattributes` and `.editorconfig`, into this repository. Verify that the file list of each path equals `git ls-files` of the source for that path.
- [x] 1.2 Copy the source workflows `test.yml`, `release-oxlint.yml` and `release-golint.yml` into `.github/workflows/`. Verify that they sit beside `dco.yml` and `scorecard.yml`, which stay unchanged.

## 2. Module path and document URLs

- [x] 2.1 Change the module path in `golint/go.mod` to `github.com/inflexa-ai/lint/golint`, each import of the module, and the module key of the version string in `golint/cmd/inflexa-lint/main.go`. Verify that `go build ./...` passes and that `go run ./cmd/inflexa-lint version` prints `+golint.(devel)`.
- [x] 2.2 Point the `url` constant of each analyzer, each `original-url` of `golint/config/golangci.base.yml`, and the URL prefix of `golint/plugin/plugin_test.go` at `https://github.com/inflexa-ai/lint/blob/main/docs/rules/`. Verify that `go test ./plugin/` passes.
- [x] 2.3 Point each `meta.docs.url` of the TypeScript and React rules, the expected URL of each `documentation.test.ts`, and the `repository.url` of both package manifests at `inflexa-ai/lint`. Verify that `npm test` at `oxlint/` passes.

## 3. Base configuration without the facts of one consumer

- [x] 3.1 Remove the `keyowner` keys, the `rawhttp` client packages and the command names of the gosec exclusion rule from `golint/config/golangci.base.yml`, as design.md describes. Verify that the base keeps each other entry.
- [x] 3.2 In `TestRenderOverlay` of `golint/config/config_test.go`, change only the expected `client-packages` to `[example.com/fixture/provider/httpc]` and keep each other assertion. Add a test of `golint/config/` for the scenario "The base holds no fact of one repository": the rendered `keyowner` entry has no `settings`, the `rawhttp` settings have no `client-packages`, and no exclusion path names a directory below `cmd/`. Verify that `go test ./config/` passes.
- [x] 3.3 Rewrite the base-configuration paragraph of `docs/rules/keyowner.md`, `rawhttp.md`, `notfoundguard.md` and `testplacement.md` so that it names the base configuration and the facts that an overlay adds, in ASD-STE100. Verify that each paragraph agrees with `golangci.base.yml`.

## 4. Neutral names in the test data

- [x] 4.1 Rename each test-data path, package, file and test name that names the former consumer in `rawhttp`, `typedids`, `keyowner`, `testplacement` and `plugin` to the neutral names of design.md, with the `// want` comments and the tests that name them. Verify that `go test ./...` at `golint/` passes.

## 5. Release and CI

- [x] 5.1 Remove from `oxlint/scripts/release.mjs` the unpkg rewrite with its link count, the copy of the rule documents, the `repository` that only GitHub Actions gets, and the check for the name of the private repository. Stage `files: ["dist"]` and the `repository` of the source manifest, and update the comments that describe the removed steps. Verify that `node scripts/release.mjs` passes, and that each staged manifest and rule agrees with the package-ci scenario "A local dry run".
- [x] 5.2 Run each job of the three workflows on `ubuntu-latest`, pin each `uses:` to a commit SHA with a version comment as design.md describes, and update the comment of `release-oxlint.yml` about `repository.url` and provenance. Verify that no workflow names `self-hosted` and that each `uses:` holds a 40-character SHA.
- [x] 5.3 Add the `npm` entry for `/oxlint` and the `gomod` entry for `/golint` to `.github/dependabot.yml`. Verify that the file parses as YAML and keeps the `github-actions` entry.
- [x] 5.4 Run `golint/scripts/release.sh` without `--push`. Verify that it ends with its dry-run message.

## 6. README

- [x] 6.1 Add the `oxlint` and `golint` sections, each with its release subsection, to `README.md` before `Contribute`, as design.md describes, in ASD-STE100. Verify that the commands and paths in the sections agree with the tree.

## 7. Final checks

- [x] 7.1 Run `npm ci`, `npm run format:check`, `npm run typecheck`, `npm run lint` and `npm test` at `oxlint/`, and `gofmt -l .`, `go vet ./...` and `go test ./...` at `golint/`. Verify that each passes and that `gofmt -l .` prints nothing.
- [x] 7.2 Search the tree case-insensitively, without `.git/`, `node_modules/`, `dist/`, `.release/` and `openspec/specs/`, for the name and the URL of the private source repository, and for the names of its former consumer and of that consumer's paths and keys. Search the files outside `openspec/` for `self-hosted`, `unpkg` and `GOPRIVATE`. Verify that no file matches. The archive of this change syncs the deltas into `openspec/specs/`, and a search of the whole tree follows it.
