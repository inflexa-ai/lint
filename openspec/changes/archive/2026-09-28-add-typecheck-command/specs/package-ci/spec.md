# Spec Delta

## MODIFIED Requirements

### Requirement: The staged npm package names this repository and links each rule here

The npm release SHALL stage and publish `@inflexa-ai/typecheck`, `@inflexa-ai/oxlint-plugin` and `@inflexa-ai/oxlint-plugin-react` at one shared version, each package after the packages that it depends on. The release SHALL write the `repository` of the source manifest into each staged manifest, in a local run and in GitHub Actions. That `repository` SHALL name `git+https://github.com/inflexa-ai/lint.git` and the directory of the package under `oxlint/`. Each rule of a staged package SHALL keep the `meta.docs.url` of the source. A staged package SHALL hold `dist/`, `LICENSE`, its `NOTICE` when the source package has one, and its manifest, and no copy of the rule documents. The release SHALL run when a push to the default branch changes the manifest of any of these packages.

#### Scenario: A local dry run

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/` outside GitHub Actions
- **THEN** each staged `package.json` holds `repository` with the URL `git+https://github.com/inflexa-ai/lint.git` and the directory of that package, each rule in the staged `dist/` links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, the staged packages of `@inflexa-ai/typecheck` and `@inflexa-ai/oxlint-plugin-react` hold `NOTICE`, and no staged package holds a `docs/` folder

#### Scenario: The dry run proves the command

- **WHEN** the dry run installs the tarballs into a scratch project with a type error and a type that resolves to `{}`
- **THEN** `inflexa-typecheck` in the scratch project prints the diagnostic and the report of `no-generated-empty-object-type`, and exits with status 1
