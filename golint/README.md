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
the version string, for example `v2.14.0+golint.v0.1.0+bin.1a2b3c4d5e6f7089`.
The string has three segments: the version of golangci-lint, the version of
this module, and a fingerprint of the executable file. The fingerprint is the
first 16 hex characters of SHA-256 of the file.

golangci-lint uses the whole string in the key of its cache. Thus a change of
any rule, in this module or in the repository, clears the old issues, and an
unchanged binary keeps its cache.

golangci-lint reads one configuration file, and it has no `extends`. Thus
`inflexa-lint-config` writes two files into the repository from the base in
this module:

- `.golangci.yml`, with the module path of the repository in each import path,
  and the names of the typed IDs of the repository for `typedids`.
- `golangci/rules.go`, the ruleguard patterns that gocritic loads.

When the overlay sets the `ids-package` of `typedids`, `inflexa-lint-config`
loads that package and writes its names into `.golangci.yml`. The names are part of the key of the
lint cache, thus a new typed ID makes golangci-lint analyze each package again.
Run `inflexa-lint-config` again after a change of the typed IDs.

Commit both files. Put the local choices of the repository in
`golangci/overlay.yml`, for example `issues.new-from-merge-base` or more
exclusion rules. The overlay merges into the base with these rules:

- A mapping merges by key.
- A list of the overlay comes after the list of the base.
- Each other value of the overlay replaces the value of the base.

An overlay cannot remove an entry of the base.

The base holds only the rules that apply to each Go module. The analyzers
`typedids`, `keyowner`, `rawhttp` and `testplacement` need the facts of a
repository, thus the base does not turn them on. An overlay turns each one on
with its settings:

```yaml
linters:
  enable:
    - typedids
  settings:
    custom:
      typedids:
        settings:
          ids-package: example.com/svc/kernel/ids
```

The overlay gets no `{{module}}` substitution, thus each path in it is
literal. The depguard layers, the exclusion paths and the ruleguard patterns of
a repository go into the overlay too. A second ruleguard file joins the file of
the base through the `rules` setting of gocritic, as in
`${config-path}/golangci/rules.go,${config-path}/golangci/local_rules.go`.

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

## Add the analyzers of the repository

A repository adds its own Go rules to the lint run. The rules, their plugin
package, and the `main` package are in the tools module. The fixture
[`lintmain/testdata/consumer/`](lintmain/testdata/consumer/) has this layout.
The test of `lintmain` proves the steps and the cache rule.

Put each rule in its own package under `tools/lint/rules/`, for example
`tools/lint/rules/localrule/`. A rule is a `go/analysis` analyzer. Give each
rule an `analysistest` test in a `_test.go` file beside the analyzer. The test
data of a rule goes into its `testdata` folder. A `go.mod` in that folder puts
`analysistest` in module mode. The test names the package by its path in the
tools module:

```go
func TestAnalyzer(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), localrule.New(),
		"example.com/svc/tools/lint/rules/localrule/testdata")
}
```

Put a plugin package beside the rules, for example `tools/lint/plugin/`. It
registers each rule with its name, as [`plugin/plugin.go`](plugin/plugin.go)
of this module registers the rules of this module. The fixture gives the full
package:

```go
package plugin

import (
	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"

	"example.com/svc/tools/lint/rules/localrule"
)

func init() {
	register.Plugin("localrule", func(settings any) (register.LinterPlugin, error) {
		return linter{analyzer: localrule.New(), mode: register.LoadModeSyntax}, nil
	})
}

type linter struct {
	analyzer *analysis.Analyzer
	mode     string
}

func (l linter) BuildAnalyzers() ([]*analysis.Analyzer, error) {
	return []*analysis.Analyzer{l.analyzer}, nil
}

func (l linter) GetLoadMode() string { return l.mode }
```

Put the `main` package in `tools/lint/cmd/`, for example
`tools/lint/cmd/svc-lint/`. It imports the plugin package of this module and
the plugin packages of the repository, and it calls `lintmain.Run`:

```go
package main

import (
	_ "example.com/svc/tools/lint/plugin"
	_ "github.com/inflexa-ai/lint/golint/plugin"

	"github.com/inflexa-ai/lint/golint/lintmain"
)

func main() {
	lintmain.Run()
}
```

Declare each rule in `golangci/overlay.yml`, and turn it on. The name of the
`custom` entry is the name of the registration:

```yaml
linters:
  enable:
    - localrule
  settings:
    custom:
      localrule:
        type: module
```

Put this module and `plugin-module-register` into the tools module. Do a test
of the rules. Then build the tool. Then run the lint:

```sh
go get -C tools github.com/inflexa-ai/lint/golint github.com/golangci/plugin-module-register
go test -C tools ./lint/rules/...
go build -C tools -o ../svc-lint ./lint/cmd/svc-lint
./svc-lint run ./...
```

The version string of the binary ends with a fingerprint: the first 16 hex
characters of SHA-256 of the executable file. golangci-lint uses the whole
string in the key of its cache. Thus a change of a rule clears the cached
issues, and an unchanged binary keeps its cache. The hash of a 60 MB binary
takes about 30 ms.

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
