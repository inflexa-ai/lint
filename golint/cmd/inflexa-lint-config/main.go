// Command inflexa-lint-config writes the golangci-lint configuration of golint
// into a repository: .golangci.yml from the base configuration and the overlay
// golangci/overlay.yml of the repository, and the ruleguard rules file
// golangci/rules.go. It loads the typed ID package of the repository and writes
// its names into the configuration. With -check it writes nothing, prints each file that
// differs or is absent, and exits with status 1 when it printed a file.
package main

import (
	"bytes"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"slices"

	"golang.org/x/mod/modfile"

	"github.com/inflexa-ai/lint/golint/config"
)

const dslModule = "github.com/quasilyte/go-ruleguard/dsl"

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}

func run(args []string, stdout, stderr io.Writer) int {
	flags := flag.NewFlagSet("inflexa-lint-config", flag.ContinueOnError)
	flags.SetOutput(stderr)
	dir := flags.String("dir", ".", "the root of the repository: the directory of its go.mod")
	check := flags.Bool("check", false, "write nothing; print each file that differs or is absent, and exit 1 if one does")
	if err := flags.Parse(args); err != nil {
		return 2
	}
	files, hasDSL, err := render(*dir)
	if err != nil {
		fmt.Fprintf(stderr, "inflexa-lint-config: %v\n", err)
		return 2
	}
	names := make([]string, 0, len(files))
	for name := range files {
		names = append(names, name)
	}
	slices.Sort(names)
	if *check {
		drift := false
		for _, name := range names {
			current, err := os.ReadFile(filepath.Join(*dir, name))
			if err != nil && !errors.Is(err, fs.ErrNotExist) {
				fmt.Fprintf(stderr, "inflexa-lint-config: %v\n", err)
				return 2
			}
			if err != nil || !bytes.Equal(current, files[name]) {
				fmt.Fprintln(stdout, name)
				drift = true
			}
		}
		if drift {
			return 1
		}
		return 0
	}
	for _, name := range names {
		path := filepath.Join(*dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			fmt.Fprintf(stderr, "inflexa-lint-config: %v\n", err)
			return 2
		}
		if err := os.WriteFile(path, files[name], 0o644); err != nil {
			fmt.Fprintf(stderr, "inflexa-lint-config: %v\n", err)
			return 2
		}
	}
	if !hasDSL {
		fmt.Fprintf(stderr, "inflexa-lint-config: go.mod does not require %s, and gocritic cannot load %s without it: run go get %s\n",
			dslModule, config.RulesFile, dslModule)
	}
	return 0
}

func render(dir string) (map[string][]byte, bool, error) {
	gomod := filepath.Join(dir, "go.mod")
	data, err := os.ReadFile(gomod)
	if err != nil {
		return nil, false, fmt.Errorf("read the module path: %w", err)
	}
	mod, err := modfile.ParseLax(gomod, data, nil)
	if err != nil {
		return nil, false, err
	}
	if mod.Module == nil {
		return nil, false, fmt.Errorf("%s has no module line", gomod)
	}
	overlay, err := os.ReadFile(filepath.Join(dir, config.OverlayFile))
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		return nil, false, err
	}
	files, err := config.Render(dir, mod.Module.Mod.Path, overlay)
	if err != nil {
		return nil, false, err
	}
	hasDSL := slices.ContainsFunc(mod.Require, func(r *modfile.Require) bool { return r.Mod.Path == dslModule })
	return files, hasDSL, nil
}
