package testplacement_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/testplacement"
)

func TestAnalyzer(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), testplacement.Analyzer,
		"example.com/svc/modules/iam", "example.com/svc/modules/iam/tests")
}

func TestSettings(t *testing.T) {
	a := testplacement.New(testplacement.Settings{TestsDir: "spec", InternalSuffix: "_white_test.go"})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/custom", "example.com/svc/custom/spec")
}
