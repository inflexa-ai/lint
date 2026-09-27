package config_test

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"testing"

	"github.com/inflexa-ai/lint/golint/config"
)

var plugins = []string{
	"typedids", "errtext", "notfoundguard", "blankerr", "boundedfanout", "detachedctx",
	"keyowner", "rawhttp", "anyapi", "testplacement", "swagsync",
}

var (
	buildOnce sync.Once
	binPath   string
	errBuild  error
	binDir    string
)

func TestMain(m *testing.M) {
	code := m.Run()
	if binDir != "" {
		_ = os.RemoveAll(binDir)
	}
	os.Exit(code)
}

// lintBinary builds cmd/inflexa-lint one time for the test binary. The run on
// the fixture needs the fixture as its working directory, thus go run from
// the module root cannot start it.
func lintBinary(t *testing.T) string {
	t.Helper()
	buildOnce.Do(func() {
		binDir, errBuild = os.MkdirTemp("", "inflexa-lint-test")
		if errBuild != nil {
			return
		}
		binPath = filepath.Join(binDir, "inflexa-lint")
		cmd := exec.Command("go", "build", "-o", binPath, "./cmd/inflexa-lint")
		cmd.Dir = ".."
		if out, err := cmd.CombinedOutput(); err != nil {
			errBuild = errors.New(string(out))
		}
	})
	if errBuild != nil {
		t.Fatalf("build inflexa-lint: %v", errBuild)
	}
	return binPath
}

// fixture copies testdata/fixture into a new directory and writes the
// rendered configuration into it.
func fixture(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	err := os.CopyFS(dir, os.DirFS(filepath.Join("testdata", "fixture")))
	if err != nil {
		t.Fatal(err)
	}
	files, err := config.Render(dir, "example.com/fixture", nil)
	if err != nil {
		t.Fatal(err)
	}
	for name, content := range files {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, content, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func command(t *testing.T, dir, name string, args ...string) (string, error) {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GOLANGCI_LINT_CACHE="+t.TempDir())
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	err := cmd.Run()
	return out.String(), err
}

func TestLintersCommandLoadsTheConfiguration(t *testing.T) {
	dir := fixture(t)
	out, err := command(t, dir, lintBinary(t), "linters", "-c", config.ConfigFile)
	if err != nil {
		t.Fatalf("inflexa-lint linters: %v\n%s", err, out)
	}
	enabled, _, _ := strings.Cut(out, "Disabled by your configuration linters:")
	for _, name := range plugins {
		if !regexp.MustCompile(`(?m)^` + name + `\b`).MatchString(enabled) {
			t.Errorf("%s is not among the enabled linters:\n%s", name, enabled)
		}
	}
}

var issueLine = regexp.MustCompile(`(?m)^(\S+?):(\d+):\d+: (.*) \((\w+)\)$`)

type issue struct{ file, line, text, linter string }

func TestRunOnTheFixture(t *testing.T) {
	dir := fixture(t)
	if out, err := command(t, dir, "go", "build", "./..."); err != nil {
		t.Fatalf("go build with %s in place: %v\n%s", config.RulesFile, err, out)
	}
	if out, err := command(t, dir, "go", "mod", "tidy", "-diff"); err != nil {
		t.Fatalf("go mod tidy -diff with %s in place: %v\n%s", config.RulesFile, err, out)
	}
	if out, err := command(t, dir, "go", "list", "-e", "-f", "{{.IgnoredGoFiles}}", "./golangci"); err != nil || strings.TrimSpace(out) != "[rules.go]" {
		t.Errorf("go list of ./golangci: %v, output %q; want [rules.go]", err, out)
	}
	if out, err := command(t, dir, lintBinary(t), "version"); err != nil || !strings.Contains(out, "+golint.(devel)") {
		t.Errorf("inflexa-lint version: %v, output %q; want +golint.(devel)", err, out)
	}
	out, err := command(t, dir, lintBinary(t), "run", "--allow-serial-runners",
		"--output.text.colors=false", "--output.text.print-issued-lines=false", "--show-stats=false",
		"-c", config.ConfigFile, "./...")
	var exitErr *exec.ExitError
	if err != nil && (!errors.As(err, &exitErr) || exitErr.ExitCode() != 1) {
		t.Fatalf("inflexa-lint run: %v\n%s", err, out)
	}
	var issues []issue
	for _, m := range issueLine.FindAllStringSubmatch(out, -1) {
		issues = append(issues, issue{file: m[1], line: m[2], text: m[3], linter: m[4]})
	}
	has := func(linter, file, line, text string) bool {
		for _, i := range issues {
			if i.linter == linter && i.file == file && (line == "" || i.line == line) && strings.Contains(i.text, text) {
				return true
			}
		}
		return false
	}
	for _, want := range []struct{ linter, file, line, text string }{
		{"sloglint", "modules/iam/iam.go", "16", `"err" key is forbidden`},
		{"sloglint", "modules/iam/iam.go", "16", "ErrorContext"},
		{"depguard", "kernel/cache/cache.go", "3", "not allowed from list 'kernel'"},
		{"gocritic", "modules/iam/iam.go", "19", "ruleguard: the bound 0"},
		{"gocritic", "handler/group/group.go", "29", "ruleguard: parse a path ID"},
		{"gocritic", "modules/iam/reset_internal_test.go", "7", "ruleguard: a hand-written TRUNCATE"},
		{"gocritic", "modules/iam/reset_internal_test.go", "10", "ruleguard: a hand-written TRUNCATE"},
		{"gocritic", "modules/iam/reset_internal_test.go", "12", "ruleguard: a hand-written TRUNCATE"},
		{"gocritic", "modules/iam/reset_internal_test.go", "13", "ruleguard: a hand-written TRUNCATE"},
		{"gocritic", "modules/iam/reset_internal_test.go", "18", "ruleguard: a hand-written TRUNCATE"},
		{"errtext", "handler/group/group.go", "11", "the condition reads the text of an error"},
		{"notfoundguard", "handler/group/group.go", "24", "a 404 answer must follow a check of the error kind"},
		{"blankerr", "modules/iam/iam.go", "18", "the error is discarded"},
		{"testplacement", "modules/iam/drive_credentials_test.go", "1", "sits beside the code"},
	} {
		if !has(want.linter, want.file, want.line, want.text) {
			t.Errorf("no %s issue at %s:%s with %q", want.linter, want.file, want.line, want.text)
		}
	}
	for _, absent := range []struct{ linter, file, line, text string }{
		{"errtext", "handler/group/group.go", "14", ""},
		{"errtext", "handler/group/group.go", "24", ""},
		{"nolintlint", "handler/group/group.go", "", ""},
		{"errcheck", "modules/iam/iam.go", "18", ""},
		{"gocritic", "modules/iam/path.go", "", "parse a path ID"},
		{"testplacement", "kernel/conc/conc_test.go", "", ""},
	} {
		if has(absent.linter, absent.file, absent.line, absent.text) {
			t.Errorf("an unexpected %s issue at %s:%s", absent.linter, absent.file, absent.line)
		}
	}
	if t.Failed() {
		t.Logf("output:\n%s", out)
	}
}
