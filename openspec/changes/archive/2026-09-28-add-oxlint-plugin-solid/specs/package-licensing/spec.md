# Spec Delta

## MODIFIED Requirements

### Requirement: Published packages declare Apache-2.0

The published packages, `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/oxlint-plugin-solid`, SHALL declare `"license": "Apache-2.0"` in their `package.json`.

#### Scenario: Each package.json names the license

- **WHEN** a reader opens `oxlint/typescript/package.json`, `oxlint/react/package.json` or `oxlint/solid/package.json`
- **THEN** the `license` field holds `Apache-2.0`

### Requirement: Each package carries the license text

Each published package directory SHALL contain a `LICENSE` file with the Apache-2.0 text, so npm packs it into the published tarball beside the `files` allowlist of `dist`.

#### Scenario: The license text ships in the tarball

- **WHEN** the package directory of a published package is packed
- **THEN** the tarball contains the `LICENSE` file with the Apache-2.0 text
