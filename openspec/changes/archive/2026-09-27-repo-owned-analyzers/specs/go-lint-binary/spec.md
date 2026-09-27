# Spec Delta

## MODIFIED Requirements

### Requirement: inflexa-lint is golangci-lint with the plugins

`golint/cmd/inflexa-lint` SHALL be a `main` package that imports `golint/plugin` for its side effect and calls `lintmain.Run` of `golint/lintmain`, and holds no other logic. It SHALL accept each command and flag of `golangci-lint`.

#### Scenario: The binary runs a configuration with the plugins

- **WHEN** a developer runs `go run ./cmd/inflexa-lint run -c <generated .golangci.yml> ./...` in a Go module
- **THEN** the run reports the issues of the built-in linters and of each enabled plugin, and `//nolint:<name> // reason` suppresses an issue of the plugin `<name>`

### Requirement: The version string carries the golint version

`inflexa-lint version` SHALL print `<golangci-lint version>+golint.<golint module version>+bin.<fingerprint>`. The two versions come from the build information of the binary: from a checkout of this repository the golint part is `(devel)`, and from a consumer that took the module at a tag the golint part is that tag. `<fingerprint>` is the first 16 hex characters of SHA-256 of the running executable, and golangci-lint salts its cache with the whole string.

#### Scenario: The version from a checkout

- **WHEN** a developer runs `go run ./cmd/inflexa-lint version` at `golint/`
- **THEN** the output contains `v2.14.0+golint.(devel)+bin.` followed by 16 hex characters
