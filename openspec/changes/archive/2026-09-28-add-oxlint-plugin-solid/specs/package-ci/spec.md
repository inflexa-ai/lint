# Spec Delta

## ADDED Requirements

### Requirement: The npm release covers each package of the workspace

`oxlint/scripts/release.mjs` SHALL release each package of the workspace at one shared version, and SHALL publish `@inflexa-ai/oxlint-plugin` before the packages that depend on it. The dry run SHALL build, stage and pack each package, install the tarballs into a scratch project, and run oxlint there with `react()` and with `solid()`. The run of `solid()` SHALL report a rule of `@inflexa-ai/oxlint-plugin` and a rule of `eslint-plugin-solid`, or the release stops. `.github/workflows/release-oxlint.yml` SHALL run when the manifest of a package of the workspace changes on the default branch.

#### Scenario: A dry run of the release

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/`
- **THEN** `.release/` holds a staged folder and a tarball at version `0.4.0` for `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/oxlint-plugin-solid`, the staged manifests of the React and Solid packages name `@inflexa-ai/oxlint-plugin` at exactly `0.4.0`, and the smoke run of `solid()` reports `no-interface` and a `solid/*` rule

#### Scenario: A change of the Solid manifest on the default branch

- **WHEN** a push to the default branch changes `oxlint/solid/package.json`
- **THEN** the release workflow runs

## MODIFIED Requirements

### Requirement: The staged npm package names this repository and links each rule here

The npm release SHALL write the `repository` of the source manifest into each staged manifest, in a local run and in GitHub Actions. That `repository` SHALL name `git+https://github.com/inflexa-ai/lint.git` and the directory of the package under `oxlint/`. Each rule of a staged package SHALL keep the `meta.docs.url` of the source, which names the document of the rule that the `lint-rule-documentation` capability gives. A staged package SHALL hold `dist/`, `LICENSE` and its manifest, and no copy of the rule documents.

#### Scenario: A local dry run

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/` outside GitHub Actions
- **THEN** each staged `package.json` holds `repository` with the URL `git+https://github.com/inflexa-ai/lint.git` and the directory of that package, each rule in the staged `dist/` of the TypeScript and React packages links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, each rule in the staged `dist/` of the Solid package links to `https://github.com/inflexa-ai/lint/blob/main/docs/rules/solid-<rule name>.md`, and the staged package holds no `docs/` folder
