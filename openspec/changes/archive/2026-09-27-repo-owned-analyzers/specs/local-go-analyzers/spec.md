# Spec Delta

## Purpose

A repository that uses `golint` adds its own `go/analysis` analyzers to the lint run without a copy of the golint command, and a change of any rule of the lint binary clears the lint cache of golangci-lint.

## ADDED Requirements

### Requirement: lintmain runs golangci-lint with each plugin of the program

The package `golint/lintmain` SHALL export `Run`, a function with no parameters and no result. `Run` SHALL build the version string from the build information of the running program and SHALL pass a `commands.BuildInfo` to `commands.Execute` of `github.com/golangci/golangci-lint/v2` v2.14.0 whose `Version` is that string and whose `Commit`, `Date` and `GoVersion` hold the values that `cmd/inflexa-lint` sets today. When `Execute` returns an error, `Run` SHALL print the error to the standard error stream and exit with status 1. Each plugin that the program imports for its side effect SHALL take part in the run under its registered name, thus `//nolint:<name> // reason` suppresses an issue of that plugin.

#### Scenario: A program with a plugin of the repository

- **WHEN** a `main` package imports `golint/plugin` and a plugin package of the repository, calls `lintmain.Run`, and runs with a configuration that enables the local plugin under its registered name
- **THEN** the run reports the issues of each enabled linter, among them the local plugin, and `//nolint:<local name> // reason` on a line of that plugin removes its issue and no other

### Requirement: The cache key changes with the binary

The version string of `lintmain.Run` SHALL end with `+bin.<fingerprint>`, where `<fingerprint>` is the first 16 hex characters of SHA-256 of the running executable. golangci-lint salts its cache with the version string, thus the cache key changes when the content of the binary changes. When `Run` cannot read or hash the executable, it SHALL print the error to the standard error stream and exit with status 1.

#### Scenario: A change of a local rule clears the cache

- **WHEN** a program that calls `lintmain.Run` reports an issue of a local rule, the source of that rule changes, the program is built again, and the new binary runs with the same cache directory on the same target
- **THEN** the second run reports the issues of the new rule and not the cached issues of the old rule

#### Scenario: The fingerprint is stable for an unchanged binary

- **WHEN** the same binary runs twice with `version`
- **THEN** each run prints the same `+bin.<fingerprint>` segment

### Requirement: The cost of the fingerprint stays small

`lintmain` SHALL read the executable and hash it one time per run. A test of the module SHALL measure the cost on the running test binary and SHALL fail when the hash takes longer than a second.

#### Scenario: The measurement of the hash

- **WHEN** the test hashes the test binary and logs the duration and the size
- **THEN** the hash completes well under the one-second bound of the requirement

### Requirement: The README gives the steps for local analyzers

`golint/README.md` SHALL hold a section for a repository that adds its own analyzers. The section SHALL give: the place of the local rules with an `analysistest` test for each rule, the plugin package that registers each local rule as `golint/plugin` does, the `main` package that imports `golint/plugin` and the local plugins and calls `lintmain.Run`, and the overlay entries that declare each local rule with `type: module` and turn it on.

#### Scenario: A reader follows the section

- **WHEN** a reader takes the steps of the section in a repository that requires the `golint` module
- **THEN** the section names each file and each command, and the overlay entries it gives merge into the generated `.golangci.yml` through the documented overlay rules
