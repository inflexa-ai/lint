// Package testplacement reports a test file outside the tests folder of its
// package.
package testplacement

import (
	"path/filepath"
	"strings"

	"golang.org/x/tools/go/analysis"
)

const (
	name = "testplacement"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/testplacement.md"
	doc  = `keep a test in the tests folder, or name it as an internal test

A _test.go file beside the code mixes two layouts, and a reader cannot
tell a black-box test from a white-box test. Put a test in the tests
folder of the package. A test that must reach unexported code keeps its
place beside the code and carries the internal suffix in its name.`
)

type Settings struct {
	TestsDir       string `json:"tests-dir"`
	InternalSuffix string `json:"internal-suffix"`
}

func New(s Settings) *analysis.Analyzer {
	if s.TestsDir == "" {
		s.TestsDir = "tests"
	}
	if s.InternalSuffix == "" {
		s.InternalSuffix = "_internal_test.go"
	}
	return &analysis.Analyzer{
		Name: name,
		Doc:  doc,
		URL:  url,
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, s)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, s Settings) {
	for _, file := range pass.Files {
		path := pass.Fset.File(file.Package).Name()
		base := filepath.Base(path)
		if !strings.HasSuffix(base, "_test.go") || strings.HasSuffix(base, s.InternalSuffix) || filepath.Base(filepath.Dir(path)) == s.TestsDir {
			continue
		}
		pass.Report(analysis.Diagnostic{
			Pos:     file.Package,
			End:     file.Name.End(),
			Message: "the test file " + base + " sits beside the code: move it to the " + s.TestsDir + " folder, or name it *" + s.InternalSuffix + " when it tests unexported code",
			URL:     url,
		})
	}
}
