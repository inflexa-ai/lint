package blankerr_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/blankerr"
)

func TestAnalyzer(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), blankerr.Analyzer, "a")
}
