package typedids_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/typedids"
)

func TestAnalyzer(t *testing.T) {
	a := typedids.New(typedids.Settings{
		IDsPackage: "example.com/svc/kernel/ids",
		Names:      []string{"UserID", "OrgID"},
	})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/provider/acme")
}

func TestEmptyNames(t *testing.T) {
	a := typedids.New(typedids.Settings{IDsPackage: "example.com/svc/kernel/ids", Names: []string{}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/emptynames")
}
