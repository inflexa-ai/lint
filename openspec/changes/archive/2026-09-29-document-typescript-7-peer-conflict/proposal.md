# Proposal

## Why

A consumer of `@inflexa-ai/oxlint-plugin-react` on TypeScript 7 gets a lockfile with an invalid peer dependency, and `npm ls --all` exits 1. The React package depends on `@tanstack/eslint-plugin-query`, which installs `@typescript-eslint/utils`; the newest release of that package declares the peer range `typescript >=4.8.4 <6.1.0` and accepts no TypeScript 7 version. npm links that peer to the root TypeScript, overrides the conflict, and leaves an invalid peer in the tree of every consumer that runs TypeScript 6.1 or later. The oxlint rules still load and report, so lint runs are unaffected, and no required step of the repository CI runs `npm ls`, so the defect is invisible here. `inflexa-ai/himmel#23`, which adopts 0.5.0, found this (inflexa-ai/lint#21).

The issue asks where the fix goes: a version of the plugin that accepts TypeScript 7, an `overrides` entry that the README tells a consumer to add, or a report upstream to typescript-eslint. The registry and probes settle the question by elimination. No released version of `@typescript-eslint/utils` accepts TypeScript 7 (8.71.0 is the newest), and every release of `@tanstack/eslint-plugin-query` in this package's range installs it, so no version bump repairs the tree. An `overrides` entry cannot repair it either, because npm applies overrides to dependency versions and never to peer edges; installs with an override, with a nested `typescript` dependency inside the React package, or with `legacy-peer-deps` all leave `npm ls --all` at exit 1. The repair belongs to typescript-eslint, which must widen the peer range; the dependency ranges of this repository pick the repaired version up with no edit, and a consumer tree takes it on the next dependency update. Until then, the consumer-facing README must state the cause, the effect, and the state of the repair, so a consumer that sees the failing `npm ls` does not search for a workaround that does not exist.

## What Changes

- The README of `@inflexa-ai/oxlint-plugin-react` gains a known-issue note in the Install section: on TypeScript 6.1 or later, `@typescript-eslint/utils`, which `@tanstack/eslint-plugin-query` installs, declares a `typescript` peer range that rejects the version (8.71.0 is the release that declares it); npm therefore reports an invalid peer and `npm ls` exits 1, while lint runs are unaffected; no `overrides` entry or install mode repairs a peer edge; `legacy-peer-deps=true` in `.npmrc` silences the install-time peer warnings and does not repair the peer; the repair lands when typescript-eslint widens the range, and a consumer tree takes it on the next dependency update.
- A test of the React package reads the README and pins that note, so a manifest edit or a documentation edit cannot silently remove it.
- The design records the drafted report to typescript-eslint; the maintainers file it. This change opens no GitHub issue and touches no manifest, no lockfile, and no rule.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `plugin-dependencies`: The React package documents the invalid TypeScript peer that its TanStack Query dependency brings on TypeScript 6.1 or later, and keeps the TanStack Query plugin bundled, beside the existing requirements about what installing the package brings.

## Impact

- Documents: `oxlint/react/README.md` (the Install section gains the known-issue note).
- Tests: `oxlint/react/src/test/dependencies.test.ts` gains a test that reads the README.
- No change to any package manifest, to `package-lock.json`, to the rules, or to the build. The invalid peer stays in consumer trees until typescript-eslint widens its `typescript` peer range; the existing ranges of this repository adopt the repaired version with no edit of this repository, and a consumer tree takes it on the next dependency update.
