package errtext_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/errtext"
)

func TestAnalyzer(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), errtext.Analyzer, "a")
}
