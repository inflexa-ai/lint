package rawhttp_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/rawhttp"
)

func TestAnalyzer(t *testing.T) {
	a := rawhttp.New(rawhttp.Settings{
		ClientPackages: []string{"example.com/svc/cmd/cli"},
		BodyPackages:   []string{"example.com/svc/handler/request"},
	})
	analysistest.Run(t, analysistest.TestData(), a,
		"example.com/svc/provider/acme", "example.com/svc/cmd/cli/internal",
		"example.com/svc/handler/v1/billing", "example.com/svc/handler/request")
}
