# Design

## Context

The packages, their documents, their workflows and their specs exist in a private source repository, where the tests pass. This repository holds only the community files, `dco.yml`, `scorecard.yml` and a `dependabot.yml` for the actions. Its `main` ruleset requires a pull request, and the history of this repository starts fresh: nothing of the source history comes over.

The lint specs were copied into `openspec/specs/` before this change. That copy changed only the Purpose lines of `go-analyzers` and `go-lint-plugins` and the title of one scenario of `go-lint-plugins`, because a delta cannot change a Purpose or rename a scenario. Each other spec change is a delta of this change.

## Goals / Non-Goals

**Goals:**

- The public tree builds, lints and tests as the source did, with the new module path and the new URLs.
- No file of the public tree names the source repository, its URL, the former consumer, or a path or key of that consumer.

**Non-Goals:**

- A publish of the npm packages, a tag of the Go module, the required checks of the ruleset, and a removal of the files from the source repository. These steps come after the merge.
- A new CI step, for example a typecheck job. The workflows keep the steps of the source.
- The overlay of the former consumer. That consumer adds its own facts after it takes the new module path.

## Decisions

### Import the tracked files at the source HEAD

Copy the files that git tracks at the source HEAD for `oxlint/`, `golint/` and `docs/rules/`, for example with `git archive HEAD <paths> | tar -x`. Also copy the source `.github/workflows/test.yml`, `release-oxlint.yml` and `release-golint.yml`, and the root `.gitignore`, `.gitattributes` and `.editorconfig`. A tracked-file copy leaves out `node_modules/`, `dist/`, `.release/` and the private notes of the source. The root `.gitignore` keeps `node_modules/`, `dist/` and `coverage/` out of git. `.gitattributes` keeps the LF line endings that oxfmt and `gofmt` expect, and `.editorconfig` keeps the editor settings of the source.

Alternative: a file-by-file copy of the working tree. Rejected, because it can take untracked files.

### Remove the facts of one consumer from the golangci-lint base

The base keeps each fact of the shared service layout: the layers `kernel/`, `modules/`, `handler/`, `middleware/`, `testutil/` and `cmd/`, the typed ID package, the not-found guard, the fan-out package, the hook methods, the body package and the register methods. The base loses each fact that only one consumer has:

- the `keys` of `keyowner`, which list the key prefixes and queue names of that consumer (the `keyowner` entry then has no `settings`)
- the `client-packages` of `rawhttp`, which named the command-line client of that consumer
- the command names in the gosec exclusion rule. The rule becomes `^(testutil/|kernel/ids/gen/)`.

An overlay adds these facts, and the overlay merge already appends a list of the overlay after the list of the base.

The not-found guard `kernel/pgerr.IsNotFound` stays in the base. depguard already denies `kernel/pgerr` in `handler/`, thus the guard changes nothing for a repository that obeys the layers, and it names no path of one consumer.

The base-configuration paragraph of each of these documents loses the name of the consumer:

- `keyowner.md`: the base configuration holds no key. A repository lists its keys in its overlay: one entry for each literal prefix of its key builders, and one entry for each queue name.
- `rawhttp.md`: the base configuration approves `handler/request` for bodies and no package for clients. An overlay can add a package.
- `notfoundguard.md`: the base configuration names `kernel/pgerr.IsNotFound` as a transition guard. The rest of the paragraph stays.
- `testplacement.md`: the base configuration applies the rule to `modules/` only. The rest of the paragraph stays.

Alternative: keep the facts as defaults of the base. Rejected, because they name the internal paths and keys of one repository.

### Use neutral names in the test data and the spec examples

Each test-data path and each spec example that named the former consumer takes a neutral name: `cmd/cli` for the command-line client, `provider/acme` for the provider, `modules/worker` for the module that reads a foreign key, `gateway_internal_test.go` for the internal test file, and `example.com/svc` for the module path of the plugin test data. A test data rename changes the directory, the package clause, the `// want` comments that name the path, and the test that names the package. No analyzer behavior changes.

### Remove the private-repository steps from the npm release

The source release rewrote each `meta.docs.url` to an unpkg URL of a document copy in the tarball, and counted the rewritten links. It wrote `repository` only in GitHub Actions, and it failed when a staged file named the private repository. Each step existed because the source was private. The release now keeps the source URL, stages `dist/`, `LICENSE` and the manifest, and sets `files: ["dist"]`. The staged manifest takes `repository` from the source manifest, in each run. The workflow comment about `repository.url` and provenance changes to match.

Alternative: keep the document copy in the tarball. Rejected, because no link points at the copy after the change.

### Run on GitHub-hosted runners and pin each action

Each job runs on `ubuntu-latest`. The test workflow keeps its trigger, its job ids, its job names and its steps. Each `uses:` pins a commit SHA with a version comment, as `dco.yml` and `scorecard.yml` do, because the release jobs hold `contents: write` and `id-token: write`. `actions/checkout` takes the SHA of v7.0.0 that `scorecard.yml` uses, which moves it from the v5 of the source. `actions/setup-node` takes the SHA of v6.5.0, and `actions/setup-go` the SHA of v7.0.0, which keep the major versions of the source. The release jobs keep the default `persist-credentials` of `actions/checkout`, because each release script pushes a tag with the credentials of the checkout. Dependabot updates the pins.

### Add npm and gomod to Dependabot

`.github/dependabot.yml` gets an `npm` entry at `/oxlint` and a `gomod` entry at `/golint`, with the weekly schedule, the pull request limit and the `minor-and-patch` group of the existing `github-actions` entry.

### Add a README section for each package

`README.md` gets an `oxlint` section and a `golint` section before `Contribute`, each with its release subsection, from the source README. The sections take the new module path. They lose the text about a private repository: the unpkg links, the document copy in the tarball, and `GOPRIVATE`. `CONTRIBUTING.md` stays as it is, because the README sections give the commands of each package.

## Risks / Trade-offs

- [The merge adds `golint/VERSION` and both package manifests, thus it starts both release workflows.] `release-golint.yml` tags `golint/v0.1.0` at the merge commit. `release-oxlint.yml` fails at the publish, because npm has no trusted publisher for packages that do not exist yet. This is the designed behavior of the release workflows: the source repository got its `golint/v0.1.0` tag from the same workflow. Mitigation: the person who merges expects both runs. The tag is the tag that the post-merge steps name. After the local publish of the npm packages and the trusted publisher, a `workflow_dispatch` run of `release-oxlint.yml` skips each published version.
- [A consumer of the old module path breaks.] Mitigation: the consumer changes its `tools/go.mod` and its imports to the new path, and moves its own facts into its overlay in the same change.
- [A rule of an old package version links to the newest document on `main`.] Accepted: the document URL is stable, and a document describes the current rule.
- [GitHub-hosted runners start from a cold cache.] The first build of golangci-lint in the `config` tests takes some minutes. Accepted.
