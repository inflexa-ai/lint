# Design

## Context

The peer chain is measurable. `@typescript-eslint/utils` 8.71.0, the latest and the canary release on 2026-09-30, declares the peer `typescript >=4.8.4 <6.1.0`; `@tanstack/eslint-plugin-query` and `eslint-plugin-solid` depend on it, and oxlint runs both as JS plugins. The workspace pins `typescript` 7.0.2, so `npm ls --all` at `oxlint/` exits 1 with `typescript@7.0.2 invalid`, and every consumer on TypeScript 7 inherits the same state. typescript-eslint closed the widening requests as not planned (#12518, #12720) until TypeScript 7 provides an API, tracked in typescript-eslint/typescript-eslint#10940.

The TypeScript 7 announcement documents the side-by-side setup: `@typescript/native` as an alias of `typescript` 7, and `typescript` as an alias of the Microsoft-published `@typescript/typescript6` (bin `tsc6`, main `lib/typescript.js`). The probe at `tmp/claude/side-by-side/` holds the layout with the two plugins: `npm ls --all` exits 0, `require('typescript')` gives 6.0.3, `node_modules/.bin/tsc` gives 7.0.2, and the TS 7 API sits at `@typescript/native/dist/api/sync/api.js`. An earlier probe family (`tmp/pi/peer-probe/`) never aliased the root `typescript`, which is why the archived `document-typescript-7-peer-conflict` change concluded that no manifest repair exists; that conclusion was wrong, and this change replaces its README note.

The workspace resolves each package to another through the `source` condition of `exports` (`oxlint/tsconfig.base.json`), so a new export entry of `@inflexa-ai/typecheck` serves the workspace from source and a consumer from `dist`.

## Goals / Non-Goals

**Goals:**

- `npm ls --all` exits 0 at `oxlint/` and in a consumer that follows the documented layout, with the plugins working and `inflexa-typecheck` reporting a type error.
- The name `typescript` means TypeScript 6 everywhere in a consumer tree; TypeScript 7 arrives only as `@typescript/native`, and no package of the workspace names a TS 7 `typescript` import, dependency or peer.
- A rule of a repository imports the TypeScript 7 modules only through `@inflexa-ai/typecheck`.
- Editors keep working: tsserver reads `typescript` (TS 6), `tsc` and `inflexa-typecheck` use TS 7. The READMEs state that difference.

**Non-Goals:**

- No version bump and no release; the packages stay at 0.5.0.
- No export of `unstable/async`, `unstable/fs`, `unstable/proto` or the deeper `unstable/ast/*` subpaths; the rules need `unstable/ast` and `unstable/sync` only.
- No upstream report from this change; the drafted report of the archived change is dropped for the link to #10940.
- No edit of another repository. inflexa-ai/himmel#23 needs its own update after this lands.
- No change to the #20 directive-guard work in the working tree.

## Decisions

**`@inflexa-ai/typecheck` owns TypeScript 7 as a dependency, not a peer.** The package declares `"@typescript/native": "npm:typescript@7.0.2"`, exact because `unstable/*` is not under semver. The alternative, an alias peer on `@typescript/native`, sends npm to the registry for a name that no package owns (`npm view @typescript/native` gives 404), and a peer forces every consumer to invent the alias value. The probe at `tmp/pi/native-dep-probe/` proves the dependency form: a consumer with the documented layout plus a package that declares the exact alias dependency installs cleanly, `npm ls --all` exits 0, and the consumer's `@typescript/native@npm:typescript@^7.0.2` dedupes with the exact dependency into one TS 7 at the consumer root. A consumer that keeps `typescript` 7 flat still works: the nested alias serves `inflexa-typecheck`, and the README tells that consumer how to adopt the layout to repair the peer.

**The re-export entries mirror the subpath names of TypeScript.** `@inflexa-ai/typecheck` gains `./unstable/ast` and `./unstable/sync`, each a `export *` of the same subpath of `@typescript/native`. The migration of a rule import is then a package-name swap, `typescript/unstable/ast` becomes `@inflexa-ai/typecheck/unstable/ast`, and the modules of the typecheck package itself import `@typescript/native/unstable/*` directly, because they sit inside the package that owns the dependency. One TS 7 serves a process: the CLI, the re-exports and a consumer resolve the same module file.

**Exact `7.0.2` in the README for `@typescript/native`.** The announcement writes `npm:typescript@^7.0.2`, but a caret can resolve a later 7.x while `@inflexa-ai/typecheck` requires exactly 7.0.2, and the two would stop deduping. The READMEs therefore instruct `npm:typescript@7.0.2` and say to raise both together when TypeScript 7 ships the API that typescript-eslint waits for. The TypeScript 6 alias keeps the caret of the announcement, `npm:@typescript/typescript6@^6.0.2`, because the peer range of `@typescript-eslint/utils` accepts the whole 6.0 line.

**The `tsc` of the test comes from `@typescript/native`.** `tsc-output.test.ts` resolves `@typescript/native/package.json` instead of `typescript/package.json`, takes `bin/tsc` from there, and asserts that the package version is `7.0.2`, so a layout mistake fails the test instead of comparing against TypeScript 6, whose alias package has `bin/tsc6` and no `bin/tsc`.

**The smoke project of the release installs the layout and proves it.** `release.mjs` installs `@typescript/native` and `typescript` from the root `devDependencies` in place of the bare `typescript`, then runs `npm ls --all` in the smoke project and stops the release on a non-zero exit. That turns the defect this change repairs into a release gate, and the spec of `package-ci` records it.

**The known-issue note becomes the fix note in each package README.** The React README loses the note that says no repair exists, drops `typescript` from its optional-peer list, and replaces the `typescript` 7.0.2 install bullet with the two alias lines; the Solid README gains the same instructions in its Install section and replaces its `typescript` 7.0.2 sentence in the Use section. Both carry the reason (the peer range of `@typescript-eslint/utils` 8.71.0, issue 10940) and the editor difference. Tests of both packages read the install instructions and pin the alias lines, the range, the release, the link, and the absence of any `typescript` 7 install instruction. The typecheck README and the root README instruct the layout where they introduce the typed rules.

## Risks / Trade-offs

- [A consumer pins `typescript` 7 flat and keeps the invalid peer] → The READMEs lead with the two alias lines, and the release smoke fails on exactly that state.
- [`export *` exposes the whole TS 7 module surface of `@inflexa-ai/typecheck`] → The surface is the same surface a rule imports from `typescript/unstable/*` today, and a narrower list would rot with each TypeScript 7 build a rule needs.
- [TS 6 editors must resolve the TS 7 declaration files through the alias] → The alias package ships a `.d.ts` beside each `.js` with no `types` condition needed, and `skipLibCheck` stays on; the README states that editors check with TS 6, so a TS 7-only syntax in an imported declaration is out of scope for them.
- [A future TS 7.x breaks `unstable/*`] → The exact pin in the dependency and in the READMEs keeps every tree on the version that the CI of this repository tests.

## Migration Plan

A consumer replaces its `typescript` devDependency with the two alias lines and switches the imports of its own typed rules to `@inflexa-ai/typecheck/unstable/*`; nothing else changes, and the package versions stay 0.5.0. Rollback restores the manifests, the imports and the README notes.

## Open Questions

None. The probes settle the dependency form and the dedupe, and the parent session approved the approach.
