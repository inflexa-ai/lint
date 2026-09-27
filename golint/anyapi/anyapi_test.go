package anyapi_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/anyapi"
)

func TestAnalyzer(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), anyapi.Analyzer, "a", "local/b", "local/c")
}
