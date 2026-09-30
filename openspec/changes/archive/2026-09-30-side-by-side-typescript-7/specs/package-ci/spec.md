# Spec Delta

## MODIFIED Requirements

### Requirement: The npm release covers each package of the workspace

`oxlint/scripts/release.mjs` SHALL release each package of the workspace at one shared version, and SHALL publish `@inflexa-ai/oxlint-plugin` before the packages that depend on it. The dry run SHALL build, stage and pack each package, install the tarballs into a scratch project, and run oxlint there with `react()` and with `solid()`. The scratch project SHALL install TypeScript 7 as `@typescript/native` and TypeScript 6 as `typescript` at the versions of the root `devDependencies`, SHALL run `npm ls --all` there, and SHALL stop the release when that command exits non-zero. The run of `solid()` SHALL report a rule of `@inflexa-ai/oxlint-plugin` and a rule of `eslint-plugin-solid`, or the release stops. `.github/workflows/release-oxlint.yml` SHALL run when the manifest of a package of the workspace changes on the default branch.

#### Scenario: A dry run of the release

- **WHEN** a person runs `node scripts/release.mjs` at `oxlint/`
- **THEN** `.release/` holds a staged folder and a tarball at version `0.5.0` for `@inflexa-ai/typecheck`, `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/oxlint-plugin-solid`, the staged manifests of the React and Solid packages name `@inflexa-ai/oxlint-plugin` at exactly `0.5.0`, the smoke run of `solid()` reports `no-interface` and a `solid/*` rule, and `npm ls --all` exits 0 in the smoke project

#### Scenario: A change of the Solid manifest on the default branch

- **WHEN** a push to the default branch changes `oxlint/solid/package.json`
- **THEN** the release workflow runs
