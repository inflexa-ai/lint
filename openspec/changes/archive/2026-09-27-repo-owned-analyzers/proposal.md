# Proposal

## Why

A repository that uses `golint` cannot add a Go rule of its own in a clean way. `cmd/inflexa-lint` is a `main` package, thus a repository must copy it to import its own plugin package. The cache key comes from the module versions of the build information, thus a rule that a repository builds from its own source has no version, and golangci-lint returns the cached issues of the old rule after a change of that rule (golangci/golangci-lint#6826).

## What Changes

- Add the package `golint/lintmain` with an exported `Run` function. `Run` builds the version string of the build information and runs golangci-lint with each plugin that the program imports. `cmd/inflexa-lint` calls `lintmain.Run` and holds no logic of its own.
- The version string gains a fingerprint of the running binary, the first 16 hex characters of SHA-256 of the executable: `<golangci-lint version>+golint.<golint version>+bin.<fingerprint>`. golangci-lint salts its cache with this string, thus a change of a rule in any plugin, in `golint` or in a repository, clears the cache.
- The fingerprint is measured: SHA-256 of a 60 MB binary takes about 30 ms on a 2024 laptop, thus no other key is necessary. A test holds the measurement and bounds it.
- `golint/README.md` gains a section for a repository that adds its own analyzers: the module of the local rules with an `analysistest` test for each rule, a plugin package that registers each local rule as `golint/plugin` does, a `main` package that imports `golint/plugin` and the local plugins and calls `lintmain.Run`, and the overlay entries that declare and turn on each local rule.
- A test of `golint/lintmain` builds a program with one local plugin, runs it on a fixture module, changes the rule, rebuilds the program and runs it again with the same cache. It proves that the issues of the second run come from the new rule.

## Capabilities

### New Capabilities

- `local-go-analyzers`: a repository adds its own `go/analysis` analyzers to the lint run, through `lintmain.Run`, a local plugin package and overlay entries, with a cache key that changes when any rule of the binary changes.

### Modified Capabilities

- `go-lint-binary`: `cmd/inflexa-lint` calls `lintmain.Run` and holds no logic of its own, and the version string carries the fingerprint of the running binary beside the two module versions.

## Impact

- Code: new `golint/lintmain` package with its tests and test data, `golint/cmd/inflexa-lint/main.go` shrinks to the plugin import and the call of `Run`, the version assertion of `golint/config/lint_test.go` extends to the `+bin.` segment.
- Documents: a new section of `golint/README.md` for the analyzers of a repository.
- Consumers: a repository that adds its own analyzers imports `golint/lintmain` and `golint/plugin` beside its local plugins, in place of copying `cmd/inflexa-lint`. Each consumer that only runs `inflexa-lint` sees no change: the same commands, the same flags, and a version string that ends with a new segment.
- Cache: each rebuild of the binary with changed rules invalidates the lint cache of golangci-lint by design; an unchanged binary keeps its cache. The fingerprint costs about 30 ms per run for a 60 MB binary.
