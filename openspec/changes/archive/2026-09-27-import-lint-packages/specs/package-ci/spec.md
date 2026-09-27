## ADDED Requirements

### Requirement: Each workflow job runs on a GitHub-hosted runner

Each job of the test workflow and of the release workflows SHALL run on `ubuntu-latest`, and no job SHALL name a self-hosted runner, because a pull request from a fork runs its own code in the job. The test workflow SHALL keep the job names `Format, lint and test at oxlint/` and `Format, vet and test at golint/`, because a required check of a ruleset matches a job by its name.

#### Scenario: A pull request from a fork

- **WHEN** a pull request from a fork opens or gains a push
- **THEN** the jobs `Format, lint and test at oxlint/` and `Format, vet and test at golint/` run on a GitHub-hosted `ubuntu-latest` runner

#### Scenario: A release on the default branch

- **WHEN** a push to the default branch changes a package manifest or `golint/VERSION`
- **THEN** the release job of that package runs on a GitHub-hosted `ubuntu-latest` runner

### Requirement: The staged npm package names this repository and links each rule here

The npm release SHALL write the `repository` of the source manifest into each staged manifest, in a local run and in GitHub Actions. That `repository` SHALL name `git+https://github.com/inflexa-ai/lint.git` and the directory of the package under `oxlint/`. Each rule of a staged package SHALL keep the `meta.docs.url` of the source. A staged package SHALL hold `dist/`, `LICENSE` and its manifest, and no copy of the rule documents.

#### Scenario: A local dry run

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/` outside GitHub Actions
- **THEN** each staged `package.json` holds `repository` with the URL `git+https://github.com/inflexa-ai/lint.git` and the directory of that package, each rule in the staged `dist/` links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, and the staged package holds no `docs/` folder

### Requirement: Dependabot updates the dependencies of each package

`.github/dependabot.yml` SHALL hold a weekly update entry for `github-actions` at `/`, for `npm` at `/oxlint`, and for `gomod` at `/golint`.

#### Scenario: A new release of a dependency

- **WHEN** a dependency of `oxlint/package-lock.json` or of `golint/go.mod` gets a new release
- **THEN** Dependabot can open a pull request that updates it, with the same weekly schedule as the updates of the actions
