package config_test

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.yaml.in/yaml/v3"

	"github.com/inflexa-ai/lint/golint/config"
)

var fixtureDir = filepath.Join("testdata", "fixture")

// fixtureOverlay is the overlay of the fixture, which holds the local choices
// of a repository, as the typed ID package and the layer rules.
func fixtureOverlay(t *testing.T) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(fixtureDir, config.OverlayFile))
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func render(t *testing.T, overlay string) (string, string) {
	t.Helper()
	files, err := config.Render(fixtureDir, "example.com/fixture", []byte(overlay))
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 2 {
		t.Fatalf("Render returned %d files, want 2", len(files))
	}
	return string(files[config.ConfigFile]), string(files[config.RulesFile])
}

func TestRenderFirstRun(t *testing.T) {
	cfg, rules := render(t, fixtureOverlay(t))
	for name, text := range map[string]string{config.ConfigFile: cfg, config.RulesFile: rules} {
		first, _, _ := strings.Cut(text, "\n")
		if !strings.Contains(first, "inflexa-lint-config") {
			t.Errorf("%s starts with %q, want the generator comment", name, first)
		}
		if strings.Contains(text, "{{module}}") {
			t.Errorf("%s holds an unrendered {{module}}", name)
		}
	}
	var doc struct {
		Linters struct {
			Settings struct {
				Custom map[string]struct {
					Type     string         `yaml:"type"`
					Settings map[string]any `yaml:"settings"`
				} `yaml:"custom"`
			} `yaml:"settings"`
		} `yaml:"linters"`
	}
	if err := yaml.Unmarshal([]byte(cfg), &doc); err != nil {
		t.Fatal(err)
	}
	typedids := doc.Linters.Settings.Custom["typedids"].Settings
	if typedids["ids-package"] != "example.com/fixture/kernel/ids" || fmt.Sprint(typedids["names"]) != "[UserID]" {
		t.Errorf("typedids settings = %v, want the ids-package of the module and names [UserID]", typedids)
	}
	if !strings.Contains(rules, "\n//go:build ruleguard\n") || !strings.Contains(rules, "decimal.NewFromFloat") {
		t.Errorf("the rules file lacks the build tag or the patterns of the base:\n%s", rules)
	}
	if strings.Index(rules, "//go:build ruleguard") > strings.Index(rules, "package gorules") {
		t.Error("the build tag must come before the package clause")
	}
}

func TestRenderOverlay(t *testing.T) {
	base, _ := render(t, "")
	cfg, _ := render(t, `
issues:
  new-from-merge-base: main
  max-same-issues: 5
linters:
  exclusions:
    rules:
      - path: ^scripts/
        linters: [gosec]
  settings:
    custom:
      rawhttp:
        settings:
          client-packages: [example.com/fixture/provider/httpc]
`)
	var got struct {
		Issues  map[string]any `yaml:"issues"`
		Linters struct {
			Exclusions struct {
				Rules []struct {
					Path    string   `yaml:"path"`
					Linters []string `yaml:"linters"`
				} `yaml:"rules"`
			} `yaml:"exclusions"`
			Settings struct {
				Custom map[string]struct {
					Settings map[string]any `yaml:"settings"`
				} `yaml:"custom"`
			} `yaml:"settings"`
		} `yaml:"linters"`
	}
	if err := yaml.Unmarshal([]byte(cfg), &got); err != nil {
		t.Fatal(err)
	}
	if got.Issues["new-from-merge-base"] != "main" || got.Issues["max-same-issues"] != 5 || got.Issues["uniq-by-line"] != false {
		t.Errorf("issues = %v, want the overlay scalars merged into the base", got.Issues)
	}
	rules := got.Linters.Exclusions.Rules
	if last := rules[len(rules)-1]; last.Path != "^scripts/" || len(last.Linters) != 1 || last.Linters[0] != "gosec" {
		t.Errorf("the last exclusion rule is %+v, want the rule of the overlay", last)
	}
	var baseDoc struct {
		Linters struct {
			Exclusions struct {
				Rules []any `yaml:"rules"`
			} `yaml:"exclusions"`
		} `yaml:"linters"`
	}
	if err := yaml.Unmarshal([]byte(base), &baseDoc); err != nil {
		t.Fatal(err)
	}
	if len(rules) != len(baseDoc.Linters.Exclusions.Rules)+1 {
		t.Errorf("%d exclusion rules, want the %d of the base and the one of the overlay", len(rules), len(baseDoc.Linters.Exclusions.Rules))
	}
	clients := fmt.Sprint(got.Linters.Settings.Custom["rawhttp"].Settings["client-packages"])
	if clients != "[example.com/fixture/provider/httpc]" {
		t.Errorf("client-packages = %v, want the overlay entry", clients)
	}
	if !strings.Contains(cfg, "# standard set") {
		t.Error("the merge dropped a comment of the base")
	}
}

func TestRenderBaseHoldsNoRepositoryFact(t *testing.T) {
	cfg, _ := render(t, "")
	var doc struct {
		Linters struct {
			Exclusions struct {
				Paths []string `yaml:"paths"`
				Rules []struct {
					Path       string `yaml:"path"`
					PathExcept string `yaml:"path-except"`
				} `yaml:"rules"`
			} `yaml:"exclusions"`
			Settings struct {
				Custom map[string]struct {
					Settings map[string]any `yaml:"settings"`
				} `yaml:"custom"`
			} `yaml:"settings"`
		} `yaml:"linters"`
	}
	if err := yaml.Unmarshal([]byte(cfg), &doc); err != nil {
		t.Fatal(err)
	}
	custom := doc.Linters.Settings.Custom
	if settings := custom["keyowner"].Settings; settings != nil {
		t.Errorf("keyowner settings = %v, want none", settings)
	}
	if clients, ok := custom["rawhttp"].Settings["client-packages"]; ok {
		t.Errorf("rawhttp client-packages = %v, want none", clients)
	}
	paths := doc.Linters.Exclusions.Paths
	for _, rule := range doc.Linters.Exclusions.Rules {
		paths = append(paths, rule.Path, rule.PathExcept)
	}
	for _, path := range paths {
		if path != "" && path != `_test\.go` && path != `^cmd/` {
			t.Errorf("the exclusion path %q names a folder of one repository", path)
		}
	}
	if strings.Contains(cfg, "example.com/fixture/") {
		t.Error("the base names a package of the module; only the overlay of a repository can")
	}
}

func TestRenderInvalidOverlay(t *testing.T) {
	if _, err := config.Render(fixtureDir, "example.com/fixture", []byte("issues: [")); err == nil {
		t.Error("Render accepted an overlay that is not YAML")
	}
}

func TestRenderTypedIDPackageThatDoesNotLoad(t *testing.T) {
	overlay := "linters: {settings: {custom: {typedids: {settings: {ids-package: example.com/fixture/kernel/absent}}}}}"
	_, err := config.Render(fixtureDir, "example.com/fixture", []byte(overlay))
	if err == nil || !strings.Contains(err.Error(), "example.com/fixture/kernel/absent") {
		t.Errorf("error %v, want one that names the typed ID package", err)
	}
}

func TestRenderPlainModule(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module example.com/plain\n\ngo 1.26\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "plain.go"), []byte("package plain\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := config.Render(dir, "example.com/plain", nil); err != nil {
		t.Errorf("Render of a module with none of the folders of another repository: %v", err)
	}
}
