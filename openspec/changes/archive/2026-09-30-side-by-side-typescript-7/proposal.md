# Proposal

## Why

A consumer of `@inflexa-ai/oxlint-plugin-react` or `@inflexa-ai/oxlint-plugin-solid` on TypeScript 7 gets a lockfile with an invalid peer dependency, and `npm ls --all` exits 1 (inflexa-ai/lint#21, and the same finding for the Solid package). The cause sits outside this repository: `@typescript-eslint/utils` 8.71.0, which `@tanstack/eslint-plugin-query` and `eslint-plugin-solid` install, declares the peer range `typescript >=4.8.4 <6.1.0`, and typescript-eslint closed the requests to widen it as not planned until TypeScript 7 ships an API (typescript-eslint/typescript-eslint#10940). The workspace itself fails `npm ls --all` the same way.

The repair on this side is the side-by-side setup that the TypeScript 7 announcement documents: TypeScript 7 installs under the alias `@typescript/native`, and the name `typescript` holds TypeScript 6 through the Microsoft-published alias package `@typescript/typescript6`. The peer of `@typescript-eslint/utils` then resolves to TypeScript 6, `npm ls --all` exits 0, and TypeScript 7 keeps arriving under its own name for `tsc` and `inflexa-typecheck`. A probe proved the layout, and this change moves the workspace and the published packages onto it.

## What Changes

- **BREAKING**. `@inflexa-ai/typecheck` declares the dependency `"@typescript/native": "npm:typescript@7.0.2"` and declares no `typescript` peer. It exports the TypeScript 7 AST module as `./unstable/ast` and the TypeScript 7 sync API module as `./unstable/sync`. A typed rule imports these modules through `@inflexa-ai/typecheck` and never names a TypeScript 7 package; a repository whose rules import `typescript/unstable/*` must switch those imports.
- The sources of the workspace stop importing `typescript/unstable/*`: the modules of `@inflexa-ai/typecheck` import `@typescript/native/unstable/*`, and the typed rules of the React package import `@inflexa-ai/typecheck/unstable/*`. The React package declares no `typescript` peer.
- The workspace installs the layout: `@typescript/native` at `npm:typescript@7.0.2` and `typescript` at `npm:@typescript/typescript6@^6.0.2`, so `npm ls --all` at `oxlint/` exits 0. Under the layout, editors check with TypeScript 6 through `typescript`, while `tsc` and `inflexa-typecheck` check with TypeScript 7.
- The test of the `tsc` output resolves the compiler through `@typescript/native` and asserts the version 7.0.2, so the comparison never runs against TypeScript 6.
- The READMEs replace the known-issue note and every `typescript` 7.0.2 install instruction with the fix. The React README drops `typescript` from its optional-peer list and carries the two devDependencies lines with the reason (the peer range of `@typescript-eslint/utils` 8.71.0, tracked as typescript-eslint/typescript-eslint#10940) and the editor difference; the Solid README instructs the same layout in its Install section and its Use section. The typecheck README and the root README instruct the layout the same way. Tests pin the React and Solid instructions.
- The release smoke installs the two aliases as a consumer does, runs `npm ls --all` in the smoke project, and stops the release when that command exits non-zero.
- This change opens no GitHub issue and files no report upstream; the design drops the drafted report of the archived `document-typescript-7-peer-conflict` change for the link to #10940.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `typecheck-command`: The package takes TypeScript 7 as the exact `@typescript/native` dependency instead of a `typescript` peer, the workspace installs the two aliases, and the package re-exports the TypeScript 7 modules that a rule needs.
- `plugin-dependencies`: The README requirement about the invalid peer becomes the requirement that the React and Solid READMEs instruct the side-by-side install and pin it with tests, and the React package declares no `typescript` peer.
- `typed-rules`: The React package keeps `@inflexa-ai/typecheck` as its only optional peer for the `./typecheck` entry, and its typed rules import the TypeScript 7 modules through `@inflexa-ai/typecheck`.
- `package-ci`: The release smoke installs the two TypeScript aliases and runs `npm ls --all` in the smoke project as a release gate.

## Impact

- Manifests: `oxlint/package.json`, `oxlint/typecheck/package.json`, `oxlint/react/package.json`, and `oxlint/package-lock.json`.
- Sources: the imports of `typescript/unstable/*` in `oxlint/typecheck/src/**`, the two typed rules of `oxlint/react/src/typed-rules/`, the new re-export modules of `@inflexa-ai/typecheck`, and `oxlint/typecheck/src/test/tsc-output.test.ts`.
- Documents: `oxlint/README.md`, `oxlint/react/README.md`, `oxlint/solid/README.md`, `oxlint/typecheck/README.md`.
- Release: `oxlint/scripts/release.mjs`.
- Tests: the dependency tests of the React package, a manifest test of the typecheck package, and the release smoke.
- Consumers: a repository on the layout keeps every command working; a repository that installs `typescript` 7 flat keeps working but holds the invalid peer until it adopts the layout; a repository with own typed rules switches their imports to `@inflexa-ai/typecheck/unstable/*` (inflexa-ai/himmel#23 needs that update after this lands).
