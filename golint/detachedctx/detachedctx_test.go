package detachedctx_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/detachedctx"
)

func TestAnalyzer(t *testing.T) {
	a := detachedctx.New(detachedctx.Settings{HookMethods: []string{"AfterCommit"}})
	analysistest.Run(t, analysistest.TestData(), a, "a")
}
