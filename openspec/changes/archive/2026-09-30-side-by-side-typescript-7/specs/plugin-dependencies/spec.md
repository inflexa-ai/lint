# Spec Delta

## REMOVED Requirements

### Requirement: The README documents the invalid TypeScript peer of the TanStack Query dependency

**Reason**: The side-by-side TypeScript setup repairs the invalid peer, so the known-issue note that documents an unrepairable tree is wrong. The READMEs now instruct the repair.

**Migration**: The requirement "The READMEs instruct the side-by-side TypeScript install" replaces it, and the tests that pinned the old note pin the new install instructions.

## ADDED Requirements

### Requirement: The READMEs instruct the side-by-side TypeScript install

The README of the React package and the README of the Solid package SHALL instruct in their install instructions the side-by-side install of TypeScript: `@typescript/native` at `npm:typescript@7.0.2` for the compiler and the typed rules, and `typescript` at `npm:@typescript/typescript6@^6.0.2` for the editors. The install instructions SHALL name the package `typescript` no longer as an optional peer of the React package and SHALL hold no instruction that installs `typescript` 7. Each README SHALL give the reason: `@typescript-eslint/utils`, which `@tanstack/eslint-plugin-query` and `eslint-plugin-solid` install, declares the peer range `typescript >=4.8.4 <6.1.0` in release 8.71.0, and typescript-eslint tracks the TypeScript 7 API that lets it widen the range in its issue typescript-eslint/typescript-eslint#10940. Each README SHALL state that the layout makes `npm ls --all` exit 0, that the name `typescript` means TypeScript 6 for the editors and for the plugins, and that `tsc` and `inflexa-typecheck` check with TypeScript 7 through `@typescript/native`.

#### Scenario: A reader of a README finds the layout

- **WHEN** a reader opens the install instructions of `oxlint/react/README.md` or of `oxlint/solid/README.md`
- **THEN** they hold the two `devDependencies` lines with the alias values, name `@typescript-eslint/utils` 8.71.0 and its peer range as the reason, link typescript-eslint/typescript-eslint#10940, state that `npm ls --all` exits 0 and that the editors read `typescript` as TypeScript 6 while `tsc` and `inflexa-typecheck` check with TypeScript 7, and hold no instruction that installs `typescript` 7

#### Scenario: A test pins each note

- **WHEN** the test suite of the React package or of the Solid package runs
- **THEN** a test reads the install instructions of its README and fails when they lose an alias line, the peer range, the release 8.71.0, or the link to issue 10940, or when an instruction installs `typescript` 7 or names it an optional peer of the React package
