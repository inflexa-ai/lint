# Spec Delta

## MODIFIED Requirements

### Requirement: Published packages declare Apache-2.0

Each published package of this repository, `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/typecheck`, SHALL declare `"license": "Apache-2.0"` in its `package.json`.

#### Scenario: Each package.json names the license

- **WHEN** a reader opens `oxlint/typescript/package.json`, `oxlint/react/package.json` or `oxlint/typecheck/package.json`
- **THEN** the `license` field holds `Apache-2.0`

### Requirement: Each package carries the license text

Each published package directory SHALL contain a `LICENSE` file with the Apache-2.0 text, so npm packs it into the published tarball beside the `files` allowlist of `dist`.

#### Scenario: The license text ships in the tarball

- **WHEN** the package directory of any published package is packed
- **THEN** the tarball contains the `LICENSE` file with the Apache-2.0 text

## ADDED Requirements

### Requirement: A package with a ported rule carries the upstream notice

A published package that holds a rule ported from a third-party package SHALL carry a `NOTICE` file with the copyright line and the license text of each upstream package. `@inflexa-ai/typecheck` SHALL carry the MIT notices of `@ninoseki/eslint-plugin-neverthrow` and of typescript-eslint. `@inflexa-ai/oxlint-plugin-react` SHALL carry the MIT notice of `@tanstack/eslint-plugin-query`.

#### Scenario: The notice ships in the tarball

- **WHEN** the staged package of `@inflexa-ai/typecheck` is packed
- **THEN** the tarball contains `NOTICE` with the copyright line and the MIT text of `@ninoseki/eslint-plugin-neverthrow` and of typescript-eslint
