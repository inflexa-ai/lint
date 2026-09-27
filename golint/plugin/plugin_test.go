package plugin_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/analysistest"

	_ "github.com/inflexa-ai/lint/golint/plugin"
)

var settings = map[string]map[string]any{
	"typedids":      {"ids-package": "example.com/svc/kernel/ids", "names": []any{"UserID"}},
	"errtext":       nil,
	"notfoundguard": {"guards": []any{"example.com/svc/kernel/pgerr.IsNotFound"}},
	"blankerr":      nil,
	"boundedfanout": {"allowed-packages": []any{"example.com/svc/kernel/conc"}, "stop-methods": []any{"Stop"}, "start-methods": []any{}},
	"detachedctx":   {"hook-methods": []any{"AfterCommit"}, "exempt-packages": []any{"log/slog"}},
	"keyowner":      {"keys": []any{map[string]any{"prefix": "iam_", "owner": "example.com/svc/modules/iam"}}},
	"rawhttp":       {"client-packages": []any{"example.com/svc/cmd/cli"}, "body-packages": []any{"example.com/svc/handler/request"}},
	"anyapi":        {"exempt-methods": []any{"Scan"}},
	"testplacement": {"tests-dir": "tests", "internal-suffix": "_internal_test.go"},
	"swagsync":      {"register-methods": []any{"HandleGET"}},
}

func build(t *testing.T, name string, conf any) (*analysis.Analyzer, string) {
	t.Helper()
	newPlugin, err := register.GetPlugin(name)
	if err != nil {
		t.Fatal(err)
	}
	p, err := newPlugin(conf)
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	analyzers, err := p.BuildAnalyzers()
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	if len(analyzers) != 1 {
		t.Fatalf("%s: %d analyzers, want 1", name, len(analyzers))
	}
	return analyzers[0], p.GetLoadMode()
}

func TestEachPluginBuildsOneAnalyzer(t *testing.T) {
	for name, conf := range settings {
		for _, c := range []any{conf, nil} {
			a, mode := build(t, name, c)
			if a.Name != name {
				t.Errorf("plugin %s builds the analyzer %s", name, a.Name)
			}
			want := register.LoadModeTypesInfo
			if name == "testplacement" {
				want = register.LoadModeSyntax
			}
			if mode != want {
				t.Errorf("plugin %s: load mode %q, want %q", name, mode, want)
			}
		}
	}
}

func TestUnknownKey(t *testing.T) {
	for name := range settings {
		newPlugin, err := register.GetPlugin(name)
		if err != nil {
			t.Fatal(err)
		}
		_, err = newPlugin(map[string]any{"idspackage": "example.com/ids"})
		if err == nil || !strings.Contains(err.Error(), `unknown field "idspackage"`) {
			t.Errorf("plugin %s: error %v, want one that names idspackage", name, err)
		}
	}
}

func TestTypedIDsTakesNames(t *testing.T) {
	a, _ := build(t, "typedids", map[string]any{"ids-package": "example.com/svc/kernel/ids", "names": []any{"UserID"}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/provider/acme")
}

func TestEmptyListClearsTheDefault(t *testing.T) {
	a, _ := build(t, "detachedctx", map[string]any{"exempt-packages": []any{}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/cleanup")
}

func TestKeyOwnerSetting(t *testing.T) {
	a, _ := build(t, "keyowner", map[string]any{
		"keys": []any{map[string]any{"prefix": "iam_maintenance", "owner": "example.com/svc/modules/iam"}},
	})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/modules/worker")
}

func TestEachAnalyzerLinksToItsDocument(t *testing.T) {
	root, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	const prefix = "https://github.com/inflexa-ai/lint/blob/main/"
	for name := range settings {
		a, _ := build(t, name, nil)
		if a.URL != prefix+"docs/rules/"+name+".md" {
			t.Errorf("%s: URL %q, want %sdocs/rules/%s.md", name, a.URL, prefix, name)
			continue
		}
		if _, err := os.Stat(filepath.Join(root, strings.TrimPrefix(a.URL, prefix))); err != nil {
			t.Errorf("%s: %v", name, err)
		}
	}
}
