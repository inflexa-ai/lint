# go-lint-binary Specification

## Purpose
`inflexa-lint` is golangci-lint with the Go analyzers of Inflexa compiled in, so that one binary runs the built-in linters and the company rules, and a new release of the rules invalidates the lint cache.

## Requirements

### Requirement: inflexa-lint is golangci-lint with the plugins

`golint/cmd/inflexa-lint` SHALL be a `main` package that runs `commands.Execute` of `github.com/golangci/golangci-lint/v2` v2.14.0 and imports `golint/plugin` for its side effect. It SHALL accept each command and flag of `golangci-lint`.

#### Scenario: The binary runs a configuration with the plugins

- **WHEN** a developer runs `go run ./cmd/inflexa-lint run -c <generated .golangci.yml> ./...` in a Go module
- **THEN** the run reports the issues of the built-in linters and of each enabled plugin, and `//nolint:<name> // reason` suppresses an issue of the plugin `<name>`

### Requirement: The version string carries the golint version

`inflexa-lint version` SHALL print `<golangci-lint version>+golint.<golint module version>`, both read from the build information of the binary. From a checkout of this repository the golint part is `(devel)`. From a consumer that took the module at a tag, the golint part is that tag.

#### Scenario: The version from a checkout

- **WHEN** a developer runs `go run ./cmd/inflexa-lint version` at `golint/`
- **THEN** the output contains `v2.14.0+golint.(devel)`
