# Design

## Context

`golint/cmd/inflexa-lint/main.go` builds a `commands.BuildInfo` whose `Version` is `<golangci-lint version>+golint.<golint version>`, both read from the build information, and calls `commands.Execute`. golangci-lint v2.14.0 computes the salt of its lint cache in `initHashSalt` (`pkg/commands/run.go`): when `BuildInfo.Version` is neither empty nor `(devel)`, the version string itself is the binary salt; only in the `(devel)` case does it hash the executable. The golint command always sets a version from the module versions of its dependencies, thus a rebuild that changes a rule but no module version keeps the salt, and the cache returns the issues of the old rule. A repository that adds its own plugin package has no module version for it at all, which is the case of golangci/golangci-lint#6826.

## Goals / Non-Goals

**Goals:**

- One package, `golint/lintmain`, that any `main` package can call, so a repository needs no copy of `cmd/inflexa-lint`.
- A cache key that changes when the content of the lint binary changes, whatever the module versions say.
- A README section whose steps a repository can follow without reading the source, and a test that proves the steps and the cache behavior.

**Non-Goals:**

- A change to golangci-lint itself, or a request to change its salt rules upstream.
- Support for the `.so` plugin loading of golangci-lint (`type: goplugin`); the local rules compile into the binary, as the golint plugins do.
- A way to turn on a local rule from the base configuration; the overlay of the repository stays the only place, as for `typedids` and its peers.

## Decisions

### `lintmain.Run` owns the version string and the run

`Run` reads the build information, builds the same `<golangci-lint version>+golint.<golint version>` string as before, appends `+bin.<fingerprint>`, and calls `commands.Execute`. When `debug.ReadBuildInfo` returns false, the version stays `(devel)` as in the current `main`, and the fingerprint is appended to that. On an error from `Execute` it prints the error and exits with status 1, exactly as the current `main` does. `cmd/inflexa-lint` shrinks to the plugin import and the call of `Run`.

The `BuildInfo.Version` string is the only channel from a caller to the cache salt, thus the fingerprint must live inside it. Nothing in golangci-lint v2.14.0 parses the version as semver (`version.go` prints it; `run.go` salts the cache with it), thus a second `+` segment is safe.

### The fingerprint is SHA-256 of the running executable, always

`Run` hashes the file that `os.Executable` names with SHA-256 and takes the first 16 hex characters. It does this on each run and for each binary, released or built from source.

- Why always: a repository binary mixes a tagged `golint` with local rules that have no version. The content of the binary is the only key that changes when any rule changes, whatever the module versions say. A rule that changes only for the released `inflexa-lint` also invalidates the cache, which is correct and costs one hash per run.
- Why 16 hex characters: a 64-bit digest makes a false cache hit between two different rules negligible, and keeps the `version` output readable. The whole digest would work the same; the short form is a choice of output, not of safety.
- Why not pass `(devel)` and let golangci-lint hash the binary: that path exists in `computeBinarySalt`, but it triggers only for an empty or `(devel)` version, and it would drop the golint version from the `version` output that the README documents.
- Measured cost: SHA-256 of the 60 MB `inflexa-lint` binary takes about 30 ms on a 2024 laptop (about 2 GB/s with the SHA instructions of the CPU). The cost is one read of a file that the page cache holds after the first run. No other key is necessary; the issue leaves that door open and the measurement closes it.

When `Run` cannot read or hash the executable, it stops with an error rather than running with an unsalted version: a silent stale cache is a wrong lint result, which is worse than a loud failure. golangci-lint treats an unreadable binary the same way in its own hash path.

### The test proves the issue's case end to end

`golint/lintmain` holds a consumer fixture under `testdata/`, with the layout that the README section describes:

- `go.mod` for the module `example.com/svc`, which requires `github.com/quasilyte/go-ruleguard/dsl`, as the base configuration needs it for the ruleguard rules file.
- `tools/go.mod` for the module `example.com/svc/tools`, with a `require` and a `replace` of `github.com/inflexa-ai/lint/golint` that points at the working tree, and `github.com/golangci/plugin-module-register`. A repository takes the released module instead of the `replace`; the `replace` exists only so the test builds the change under test.
- `tools/lint/rules/localrule/`, the local analyzer with its `analysistest` test, `tools/lint/plugin/`, which registers `localrule` as `golint/plugin` registers its analyzers, and `tools/lint/cmd/svc-lint/`, the `main` package that imports `golint/plugin` and the local plugin and calls `lintmain.Run`.
- `golangci/overlay.yml`, which enables `localrule` and declares it with `type: module`.
- `app/`, the code under lint, with one call of `V1Call`, one call of `V2Call`, and one `V1Call` that carries `//nolint:localrule // the call is correct here`.

The test copies the fixture into a temporary directory, writes `tools/go.mod` from a template with the absolute path of the `replace`, and seeds both `go.sum` files from the `go.sum` of `golint`, which already holds a sum for each module of the graph. The sums verify modules that the warm module cache of a `golint` build already holds; the test runs each `go` command of the fixture with `GOPROXY=off`, so a missing module fails loudly instead of silently reaching the network. It renders `.golangci.yml` with `inflexa-lint-config` built from the tree, runs the rule's own `analysistest`, builds `svc-lint`, runs `version` twice and asserts the same `+bin.` segment, and runs the lint on the fixture with a fixed cache directory: the run reports `V1Call`, and a third call site with `//nolint:localrule // the call is correct here` gets no `localrule` issue. It then overwrites the rule source with the second variant, which flags `V2Call`, builds the binary again, and runs it with the same cache directory: the run reports `V2Call` and not the cached `V1Call`. It also asserts that the `version` output of the two builds ends with different `+bin.` segments.

The two rule variants are committed template files with a `.go.txt` extension beside the fixture, so a reviewer reads the diff of the rule change that the test performs, and no copy of the fixture builds a second rule package by accident.

The rule variants flag method calls by name (`V1Call`, then `V2Call`), so the fixture needs no imports and no third module, and the only moving part between the two runs is the rule source and the binary.

### README and spec alignment

The README section goes after the `nolint` paragraph and before the contributor section that starts with "Run each command of the module from this folder". It gives the four parts of the issue in order: the rules module with an `analysistest` test for each rule, the plugin package, the `main` package with `lintmain.Run`, and the overlay entries. It also states the cost of the fingerprint and the cache rule: a change of any rule clears the cache, an unchanged binary keeps it. The fixture of the test mirrors the section file for file, so the two cannot drift apart silently.

The version assertion of `golint/config/lint_test.go` extends to the `+bin.` segment with 16 hex characters, which keeps the existing `+golint.(devel)` check.

## Risks / Trade-offs

- [Each run pays the hash, also `version` and `help`.] The hash runs in `Run` before `Execute`, thus each subcommand pays about 30 ms for a 60 MB binary. Accepted: the amount is small, the code stays simple, and the `version` output carrying the fingerprint is a debugging aid for cache questions.
- [Two builds of the same source can hash differently.] The toolchain writes build IDs and paths into the binary, thus a rebuild after `go clean -cache` can invalidate the cache without a rule change. Over-invalidation costs one lint run; the hazard the change prevents is the opposite one, a stale cache. Accepted.
- [The end-to-end test is slow on a cold cache.] It builds a golangci-lint binary and runs the linter set twice on a small module. The build cache of the module makes the second build cheap, and the `config` tests already pay the same first-build cost. Accepted.
- [A reader copies the fixture `replace` into a real repository.] The README section shows the released `go get`, and the fixture comment says the `replace` serves the test only. Mitigated by the text.
