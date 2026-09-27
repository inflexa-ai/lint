// Package plugin registers each analyzer of golint as its own golangci-lint
// module plugin, under the name of the analyzer, so that //nolint:<name>
// suppresses one rule.
package plugin

import (
	"fmt"

	"github.com/golangci/plugin-module-register/register"
	"golang.org/x/tools/go/analysis"

	"github.com/inflexa-ai/lint/golint/anyapi"
	"github.com/inflexa-ai/lint/golint/blankerr"
	"github.com/inflexa-ai/lint/golint/boundedfanout"
	"github.com/inflexa-ai/lint/golint/detachedctx"
	"github.com/inflexa-ai/lint/golint/errtext"
	"github.com/inflexa-ai/lint/golint/keyowner"
	"github.com/inflexa-ai/lint/golint/notfoundguard"
	"github.com/inflexa-ai/lint/golint/rawhttp"
	"github.com/inflexa-ai/lint/golint/swagsync"
	"github.com/inflexa-ai/lint/golint/testplacement"
	"github.com/inflexa-ai/lint/golint/typedids"
)

func init() {
	register.Plugin("typedids", module("typedids", register.LoadModeTypesInfo, built(typedids.New)))
	register.Plugin("errtext", module("errtext", register.LoadModeTypesInfo, built(errtext.New)))
	register.Plugin("notfoundguard", module("notfoundguard", register.LoadModeTypesInfo, built(notfoundguard.New)))
	register.Plugin("blankerr", module("blankerr", register.LoadModeTypesInfo, built(blankerr.New)))
	register.Plugin("boundedfanout", module("boundedfanout", register.LoadModeTypesInfo, built(boundedfanout.New)))
	register.Plugin("detachedctx", module("detachedctx", register.LoadModeTypesInfo, built(detachedctx.New)))
	register.Plugin("keyowner", module("keyowner", register.LoadModeTypesInfo, built(keyowner.New)))
	register.Plugin("rawhttp", module("rawhttp", register.LoadModeTypesInfo, built(rawhttp.New)))
	register.Plugin("anyapi", module("anyapi", register.LoadModeTypesInfo, built(anyapi.New)))
	register.Plugin("testplacement", module("testplacement", register.LoadModeSyntax, built(testplacement.New)))
	register.Plugin("swagsync", module("swagsync", register.LoadModeTypesInfo, built(swagsync.New)))
}

type linter struct {
	analyzer *analysis.Analyzer
	mode     string
}

func (l linter) BuildAnalyzers() ([]*analysis.Analyzer, error) {
	return []*analysis.Analyzer{l.analyzer}, nil
}

func (l linter) GetLoadMode() string { return l.mode }

func module[S any](name, mode string, build func(S) (*analysis.Analyzer, error)) register.NewPlugin {
	return func(conf any) (register.LinterPlugin, error) {
		s, err := register.DecodeSettings[S](conf)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
		a, err := build(s)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", name, err)
		}
		return linter{analyzer: a, mode: mode}, nil
	}
}

func built[S any](newAnalyzer func(S) *analysis.Analyzer) func(S) (*analysis.Analyzer, error) {
	return func(s S) (*analysis.Analyzer, error) { return newAnalyzer(s), nil }
}
