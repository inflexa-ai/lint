# golint

The Go module `github.com/inflexa-ai/lint/golint` holds the lint rules of
Inflexa for Go. It has these parts:

- One `go/analysis` analyzer for each rule. `<analyzer>.md` in
  [`docs/rules/`](../docs/rules/) gives the principle and the settings of each
  analyzer.
- One golangci-lint module plugin for each analyzer, under the name of the
  analyzer.
- `inflexa-lint`, which is golangci-lint v2.14.0 with the plugins compiled in.
- `inflexa-lint-config`, which writes the golangci-lint configuration into a
  repository.

A release of the module is a tag `golint/vX.Y.Z`, and `go get` names it as
`vX.Y.Z`. A repository takes the two commands as tools in a separate module
file, `tools/go.mod`:

```sh
mkdir tools
go mod init -modfile=tools/go.mod example.com/svc/tools
go get -modfile=tools/go.mod -tool github.com/inflexa-ai/lint/golint/cmd/inflexa-lint@v0.1.0
go get -modfile=tools/go.mod -tool github.com/inflexa-ai/lint/golint/cmd/inflexa-lint-config@v0.1.0
```

The separate file keeps the dependencies of golangci-lint out of the `go.mod`
of the repository. `go tool -modfile=tools/go.mod inflexa-lint version` prints
the two versions, for example `v2.14.0+golint.v0.1.0`. golangci-lint uses this
string in the key of its cache, thus a new release of the rules clears the old
issues.

golangci-lint reads one configuration file, and it has no `extends`. Thus
`inflexa-lint-config` writes two files into the repository from the base in
this module:

- `.golangci.yml`, with the module path of the repository in each import path,
  and the names of the typed IDs of the repository for `typedids`.
- `golangci/rules.go`, the ruleguard patterns that gocritic loads.

`inflexa-lint-config` loads the typed ID package of the repository, and
writes the names into `.golangci.yml`. The names are part of the key of the
lint cache, thus a new typed ID makes golangci-lint analyze each package again.
Run `inflexa-lint-config` again after a change of the typed IDs.

Commit both files. Put the local choices of the repository in
`golangci/overlay.yml`, for example `issues.new-from-merge-base` or more
exclusion rules. The overlay merges into the base with these rules:

- A mapping merges by key.
- A list of the overlay comes after the list of the base.
- Each other value of the overlay replaces the value of the base.

An overlay cannot remove an entry of the base.

```sh
go tool -modfile=tools/go.mod inflexa-lint-config
go tool -modfile=tools/go.mod inflexa-lint run ./...
```

In CI, run `inflexa-lint-config -check`. It writes nothing, and it prints each
file that differs from the base and the overlay. It exits with status 1 when a
file differs.

The ruleguard patterns work only when the `go.mod` of the repository requires
`github.com/quasilyte/go-ruleguard/dsl`. Run `go get github.com/quasilyte/go-ruleguard/dsl`
one time. Without the module, the lint run stops with an error, because a
silent skip hides each pattern. `golangci/rules.go` starts with
`//go:build ruleguard`. Thus no build, test or vet reads the file, but
`go mod tidy` sees its import and keeps the requirement.

Each rule is its own linter, thus a directive can stop one rule:

```go
if strings.Contains(err.Error(), "not a member") { //nolint:errtext // the module exports no sentinel yet
```

nolintlint rejects a directive with no reason, and a directive that suppresses
nothing.

Run each command of the module from this folder:

```sh
gofmt -l .
go vet ./...
go test ./...
```

The tests of `config/` build `inflexa-lint` and run it on a fixture module. The
first build of golangci-lint takes some minutes.

## Release the Go module

`VERSION` holds the version of the module. To release, set the new version in
that file and merge the change into `main`. Then run the release from this
folder:

```sh
scripts/release.sh         # a dry run
scripts/release.sh --push  # tag golint/v<version> and push the tag
```

The dry run runs `gofmt`, `go vet`, the tests and the build, and changes
nothing. `--push` stops unless the working tree is clean and `HEAD` is
`origin/main`. The workflow `release-golint.yml` runs the same script on `main`
when `golint/VERSION` changes.
