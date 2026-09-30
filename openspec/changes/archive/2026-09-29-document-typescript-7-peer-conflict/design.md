# Design

## Context

The peer chain is measurable. The React package declares `@tanstack/eslint-plugin-query: ^5.103.2`, whose every release depends on `@typescript-eslint/utils`. The newest `@typescript-eslint/utils` (8.71.0, checked 2026-09-29) declares the peer `typescript >=4.8.4 <6.1.0`. On a consumer root with `typescript@7.0.2`, npm links the peer to the root, prints `ERESOLVE overriding peer dependency`, and leaves `npm ls --all` at exit 1; the repository workspace at `oxlint/` fails the same way, while its CI stays green because no required step runs `npm ls`. Motivation in proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- A consumer that sees the failing `npm ls` finds the cause, the effect, and the state of the repair in the README of the React package.
- The documentation is pinned by a test, so it cannot disappear silently.
- The maintainers hold a drafted report to typescript-eslint, ready to file.

**Non-Goals:**

- No manifest, lockfile, rule, or build change. No workaround exists to document as a fix; the design states this instead.
- No note in the README of the Solid package, which carries the same defect through `eslint-plugin-solid` and `@typescript-eslint/utils`. That is a separate concern.
- No filing of the upstream issue from this change: GitHub writes stay with the maintainers.
- No new CI step for `npm ls`, because a repository CI gate needs its own decision.

## Decisions

**Document instead of bump.** No released version of `@typescript-eslint/utils` accepts TypeScript 7, and every release of `@tanstack/eslint-plugin-query` in this package's range installs it, so no dependency bump repairs the tree. The own peer of `@tanstack/eslint-plugin-query` accepts `^7.0.0` since at least 5.103.2, the version this package already requires, so the range in the manifest is not the cause.

**Document instead of an override or an install mode.** npm applies `overrides` to dependency versions and never to peer edges. Probes against the published 0.5.0 tree with `typescript@7.0.2` at the root, each ending with `npm ls --all`:

| Probe | Result |
| --- | --- |
| `overrides` for the `typescript` peer of `@typescript-eslint/utils` | Inert; exit 1 |
| `overrides` for the `typescript` peer of `@tanstack/eslint-plugin-query` | Inert; exit 1 |
| `overrides` for the `typescript` peer of the React package | Hard ERESOLVE failure against the exact `7.0.2` peer |
| Nested `"typescript": "<6.1.0"` dependency inside the React package | npm places 6.0.3 under the package, but binds the subtree peers to the root; exit 1 |
| `legacy-peer-deps=true` with `eslint` installed explicitly | No install-time peer warnings, but npm still links the root TypeScript as the peer; exit 1 |

**State the escape hatch at its true effect.** The maintainer decision asks the README to mention `legacy-peer-deps=true` in `.npmrc` as the interim escape hatch. The probe above shows what it truly does: it silences the install-time peer warnings and leaves `npm ls --all` at exit 1, because npm links the in-tree root TypeScript even under legacy mode. The note therefore presents the hatch as a silencer of install warnings, never as a repair.

**Keep the TanStack Query plugin bundled.** An optional peer like `eslint-plugin-better-tailwindcss` was the alternative. It was rejected because it moves the invalid peer into the tree of every consumer that uses the `tanstack` preset, including the reporter of this issue, and because the bundled presets are a stated feature of the package.

**The note names the versions.** The note says the peer range is the one of `@typescript-eslint/utils` 8.71.0, so a reader can compare it with the current release. When typescript-eslint widens the range, the note and its pin test change in the same commit that bumps nothing else. The note says a consumer tree picks the repaired version up on the next dependency update, because the lockfile of an existing tree pins the current release.

**The drafted upstream report.** The maintainers file this text as an issue on the typescript-eslint repository:

> `@typescript-eslint/utils@8.71.0` declares the peer range `typescript >=4.8.4 <6.1.0`. TypeScript 7.0.2 is current, so every install of a package that depends on `@typescript-eslint/utils` on TypeScript 6.1 or later ends with an overridden peer and `npm ls --all` at exit 1. One reproduction is a project with `typescript@7.0.2` and `@tanstack/eslint-plugin-query@^5.103.2`. The rule sets keep working, because the plugins load and report under oxlint, but the tree holds an invalid peer, and a later npm can refuse the install. Please widen the `typescript` peer range to accept TypeScript 7.

## Risks / Trade-offs

- [The note rots when typescript-eslint widens the peer range] → The note names the release it describes, and the pin test sits next to the manifest tests, so the next edit of the dependency story meets both.
- [A consumer tries an override anyway and loses time] → The note states that no override or install mode repairs a peer edge, so the search ends at the README.

## Migration Plan

Documentation only. Rollback reverts `oxlint/react/README.md` and `oxlint/react/src/test/dependencies.test.ts`.

## Open Questions

None. The probes and the registry settle the approach, and the maintainers file the upstream report.
