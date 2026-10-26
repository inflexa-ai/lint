package anyapi_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/anyapi"
)

func TestAnalyzer(t *testing.T) {
	a := anyapi.New(anyapi.Settings{AllowTypes: []string{"a.Document"}})
	analysistest.Run(t, analysistest.TestData(), a, "a", "local/b", "local/c")
}
