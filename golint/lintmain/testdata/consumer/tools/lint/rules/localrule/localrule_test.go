package localrule_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"example.com/svc/tools/lint/rules/localrule"
)

func TestAnalyzer(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), localrule.New(),
		"example.com/svc/tools/lint/rules/localrule/testdata")
}
