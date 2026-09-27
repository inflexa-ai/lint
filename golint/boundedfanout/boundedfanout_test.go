package boundedfanout_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/boundedfanout"
)

func TestAnalyzer(t *testing.T) {
	a := boundedfanout.New(boundedfanout.Settings{AllowedPackages: []string{"example.com/svc/kernel/conc"}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/modules/iam", "example.com/svc/kernel/conc")
}

func TestEmptyStartMethods(t *testing.T) {
	a := boundedfanout.New(boundedfanout.Settings{StartMethods: []string{}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/modules/lifecycle")
}
