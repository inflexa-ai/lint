// Package plugin registers each local rule as its own golangci-lint module
// plugin, under the name of the rule, as golint/plugin does for its rules.
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
