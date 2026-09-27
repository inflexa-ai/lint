package lintmain

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var issueLine = regexp.MustCompile(`(?m)^(\S+?):(\d+):\d+: (.*) \((\w+)\)$`)

var binSegment = regexp.MustCompile(`\+bin\.([0-9a-f]{16})`)

type issue struct{ file, line, text, linter string }

func TestConsumerRuleChangeClearsTheCache(t *testing.T) {
	golintDir, err := filepath.Abs("..")
	if err != nil {
		t.Fatal(err)
	}
	work := t.TempDir()
	root := filepath.Join(work, "svc")
	if err := os.CopyFS(root, os.DirFS(filepath.Join("testdata", "consumer"))); err != nil {
		t.Fatal(err)
	}

	tmpl, err := os.ReadFile(filepath.Join("testdata", "consumer", "tools", "go.mod.template"))
	if err != nil {
		t.Fatal(err)
	}
	toolsGoMod := filepath.Join(root, "tools", "go.mod")
	if err := os.WriteFile(toolsGoMod, bytes.ReplaceAll(tmpl, []byte("{{golint}}"), []byte(golintDir)), 0o644); err != nil {
		t.Fatal(err)
	}
	sums, err := os.ReadFile(filepath.Join("..", "go.sum"))
	if err != nil {
		t.Fatal(err)
	}
	for _, dir := range []string{root, filepath.Join(root, "tools")} {
		if err := os.WriteFile(filepath.Join(dir, "go.sum"), sums, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	configBin := filepath.Join(work, "inflexa-lint-config")
	goIn(t, golintDir, "build", "-o", configBin, "./cmd/inflexa-lint-config")
	var out bytes.Buffer
	cmd := exec.Command(configBin, "-dir", root)
	cmd.Stdout, cmd.Stderr = &out, &out
	if err := cmd.Run(); err != nil {
		t.Fatalf("inflexa-lint-config: %v\n%s", err, out.String())
	}

	tools := filepath.Join(root, "tools")
	goIn(t, tools, "test", "./lint/rules/localrule/")

	bin1 := filepath.Join(work, "svc-lint-v1")
	goIn(t, tools, "build", "-o", bin1, "./lint/cmd/svc-lint")
	v1, v1again := versionOf(t, bin1), versionOf(t, bin1)
	if segment(v1) != segment(v1again) {
		t.Errorf("version of the same binary changed between runs: %q then %q", v1, v1again)
	}

	cache := filepath.Join(work, "lint-cache")
	if got := localrule(runLint(t, bin1, root, cache)); !oneAt(got, "app/app.go", "10") {
		t.Errorf("run of the first binary: %v; want one localrule issue at app/app.go:10 and none at line 11 or 12", got)
	}

	ruleV2, err := os.ReadFile(filepath.Join("testdata", "rule_v2.go.txt"))
	if err != nil {
		t.Fatal(err)
	}
	rule := filepath.Join(tools, "lint", "rules", "localrule", "localrule.go")
	if err := os.WriteFile(rule, ruleV2, 0o644); err != nil {
		t.Fatal(err)
	}

	bin2 := filepath.Join(work, "svc-lint-v2")
	goIn(t, tools, "build", "-o", bin2, "./lint/cmd/svc-lint")
	v2 := versionOf(t, bin2)
	if segment(v1) == segment(v2) {
		t.Errorf("the two builds share the +bin. segment %s; want different segments", segment(v1))
	}

	if got := localrule(runLint(t, bin2, root, cache)); !oneAt(got, "app/app.go", "11") {
		t.Errorf("run of the second binary on the cache of the first: %v; want one localrule issue at app/app.go:11 and none at line 10 or 12", got)
	}
}

func localrule(issues []issue) []issue {
	var got []issue
	for _, i := range issues {
		if i.linter == "localrule" {
			got = append(got, i)
		}
	}
	return got
}

func oneAt(issues []issue, file, line string) bool {
	return len(issues) == 1 && issues[0].file == file && issues[0].line == line
}

func segment(v string) string {
	m := binSegment.FindStringSubmatch(v)
	if m == nil {
		return ""
	}
	return m[1]
}

func versionOf(t *testing.T, bin string) string {
	t.Helper()
	var out bytes.Buffer
	cmd := exec.Command(bin, "version")
	cmd.Stdout, cmd.Stderr = &out, &out
	if err := cmd.Run(); err != nil {
		t.Fatalf("%s version: %v\n%s", bin, err, out.String())
	}
	v := strings.TrimSpace(out.String())
	if segment(v) == "" {
		t.Fatalf("%s version: %q; want a +bin. segment of 16 hex characters", bin, v)
	}
	return v
}

func runLint(t *testing.T, bin, root, cache string) []issue {
	t.Helper()
	var out bytes.Buffer
	cmd := exec.Command(bin, "run", "--allow-serial-runners",
		"--output.text.colors=false", "--output.text.print-issued-lines=false", "--show-stats=false",
		"-c", ".golangci.yml", "./...")
	cmd.Dir = root
	cmd.Env = append(os.Environ(), "GOPROXY=off", "GOLANGCI_LINT_CACHE="+cache)
	cmd.Stdout, cmd.Stderr = &out, &out
	err := cmd.Run()
	var exitErr *exec.ExitError
	if err != nil && (!errors.As(err, &exitErr) || exitErr.ExitCode() != 1) {
		t.Fatalf("svc-lint run: %v\n%s", err, out.String())
	}
	t.Cleanup(func() {
		if t.Failed() {
			t.Logf("lint output of %s:\n%s", bin, out.String())
		}
	})
	var issues []issue
	for _, m := range issueLine.FindAllStringSubmatch(out.String(), -1) {
		issues = append(issues, issue{file: m[1], line: m[2], text: m[3], linter: m[4]})
	}
	return issues
}

func goIn(t *testing.T, dir string, args ...string) {
	t.Helper()
	var out bytes.Buffer
	cmd := exec.Command("go", args...)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GOPROXY=off")
	cmd.Stdout, cmd.Stderr = &out, &out
	if err := cmd.Run(); err != nil {
		t.Fatalf("go %s: %v\n%s", strings.Join(args, " "), err, out.String())
	}
}
