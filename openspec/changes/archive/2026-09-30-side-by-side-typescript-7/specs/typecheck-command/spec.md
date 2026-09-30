# Spec Delta

## REMOVED Requirements

### Requirement: The package accepts only the TypeScript version of CI

**Reason**: The `typescript` peer ends. In the tree of a consumer that follows the side-by-side setup, the name `typescript` holds TypeScript 6, so a peer at 7 would be invalid, and TypeScript 7 arrives as the exact `@typescript/native` dependency of the package instead.

**Migration**: The requirements "The package takes TypeScript 7 as the exact alias dependency" and "The package re-exports the TypeScript 7 modules that a rule needs" replace it.

## ADDED Requirements

### Requirement: The package takes TypeScript 7 as the exact alias dependency

`@inflexa-ai/typecheck` SHALL take the exact TypeScript 7 release that the CI of this repository uses as its dependency under the alias name `@typescript/native` (`npm:typescript@7.0.2`), because `typescript/unstable/sync` is not under semver. The package SHALL declare no `typescript` peer. The workspace SHALL install TypeScript 7 as `@typescript/native` at `npm:typescript@7.0.2` and TypeScript 6 as `typescript` at `npm:@typescript/typescript6@^6.0.2`, so the peer of `@typescript-eslint/utils` resolves to TypeScript 6 and `npm ls --all` exits 0.

#### Scenario: The dependency pins the version

- **WHEN** a reader opens `oxlint/typecheck/package.json`
- **THEN** `dependencies` holds `@typescript/native` at `npm:typescript@7.0.2`, and `peerDependencies` names no `typescript` entry

#### Scenario: The workspace installs the layout

- **WHEN** a reader opens `oxlint/package.json` and runs `npm ls --all` at `oxlint/`
- **THEN** `devDependencies` holds `@typescript/native` at `npm:typescript@7.0.2` and `typescript` at `npm:@typescript/typescript6@^6.0.2`, and the command exits 0

## ADDED Requirements

### Requirement: The package re-exports the TypeScript 7 modules that a rule needs

`@inflexa-ai/typecheck` SHALL export the AST module of its TypeScript 7 dependency as `./unstable/ast` and the sync API module as `./unstable/sync`, so a typed rule imports the helpers and the types of TypeScript 7 through `@inflexa-ai/typecheck` and names no TypeScript 7 package. No module of the packages of this workspace SHALL import `typescript/unstable/*`. No manifest of the workspace SHALL declare the package `typescript` at 7 as a dependency or a peer; TypeScript 7 is declared only under the alias name `@typescript/native`.

#### Scenario: A rule imports through the package

- **WHEN** the typed rules of the React package read syntax helpers, types and checker types
- **THEN** they import them from `@inflexa-ai/typecheck/unstable/ast` and `@inflexa-ai/typecheck/unstable/sync`

#### Scenario: No workspace module names TypeScript 7

- **WHEN** a reader searches the sources and the manifests of the packages under `oxlint/`
- **THEN** no import resolves `typescript/unstable/*`, and no manifest holds a `typescript` dependency or peer at 7
