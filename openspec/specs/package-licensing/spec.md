# package-licensing Specification

## Purpose

Every published package of this repository states its license where npm reads it, and carries the license text that the statement claims.

## Requirements

### Requirement: Published packages declare Apache-2.0

The two published packages, `@inflexa-ai/oxlint-plugin` and `@inflexa-ai/oxlint-plugin-react`, SHALL declare `"license": "Apache-2.0"` in their `package.json`.

#### Scenario: Each package.json names the license

- **WHEN** a reader opens `oxlint/typescript/package.json` or `oxlint/react/package.json`
- **THEN** the `license` field holds `Apache-2.0`

### Requirement: Each package carries the license text

Each published package directory SHALL contain a `LICENSE` file with the Apache-2.0 text, so npm packs it into the published tarball beside the `files` allowlist of `dist`.

#### Scenario: The license text ships in the tarball

- **WHEN** the package directory of either published package is packed
- **THEN** the tarball contains the `LICENSE` file with the Apache-2.0 text

### Requirement: The repository carries the license text

The repository root SHALL contain the same `LICENSE` file, so a reader of the source sees the license without opening a package directory.

#### Scenario: The license text sits at the root

- **WHEN** a reader opens the repository root
- **THEN** a `LICENSE` file with the Apache-2.0 text is present
