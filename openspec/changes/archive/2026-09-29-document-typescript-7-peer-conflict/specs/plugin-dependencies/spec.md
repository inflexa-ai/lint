# Spec Delta

## ADDED Requirements

### Requirement: The README documents the invalid TypeScript peer of the TanStack Query dependency

The README of `@inflexa-ai/oxlint-plugin-react` SHALL state in the Install section that on TypeScript 6.1 or later the install tree holds an invalid `typescript` peer, that `@typescript-eslint/utils`, which `@tanstack/eslint-plugin-query` installs, declares that peer range, and that 8.71.0 is the release of `@typescript-eslint/utils` that declares it. The README SHALL state that lint runs are unaffected, that `npm ls` exits 1, and that no `overrides` entry or install mode repairs a peer edge, because npm applies overrides to dependency versions only. The README SHALL state that `legacy-peer-deps=true` in `.npmrc` silences the install-time peer warnings and does not repair the peer. The README SHALL state that the repair arrives when typescript-eslint widens the peer range, and that a consumer tree picks the repaired version up on the next dependency update after that release, with no edit of this package.

#### Scenario: A reader of the README finds the known issue

- **WHEN** a reader opens `oxlint/react/README.md`
- **THEN** the Install section names `@typescript-eslint/utils` and `@tanstack/eslint-plugin-query` as the cause of the invalid peer, names 8.71.0 as the release that declares the range, states that `npm ls` exits 1 on TypeScript 6.1 or later while lint runs are unaffected, states that no override or install mode repairs the peer, states the effect of `legacy-peer-deps=true`, and states that typescript-eslint owns the repair

#### Scenario: A test pins the note

- **WHEN** the test suite of the React package runs
- **THEN** a test reads the Install section of `oxlint/react/README.md` and fails when the note no longer names the cause, the release, the effect, the state of the repair, or the effect of `legacy-peer-deps=true`

### Requirement: The TanStack Query plugin stays a bundled dependency

`@inflexa-ai/oxlint-plugin-react` SHALL keep `@tanstack/eslint-plugin-query` in `dependencies`, because the TanStack presets are part of the package.

#### Scenario: The manifest keeps the dependency bundled

- **WHEN** a reader opens `oxlint/react/package.json`
- **THEN** `dependencies` lists `@tanstack/eslint-plugin-query`, and `peerDependencies` does not list it
