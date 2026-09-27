package keyowner_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/keyowner"
)

func TestAnalyzer(t *testing.T) {
	owner := "example.com/svc/modules/iam"
	a := keyowner.New(keyowner.Settings{Keys: []keyowner.Key{
		{Prefix: "iam_maintenance", Owner: owner},
		{Prefix: "iam_billing", Owner: owner},
		{Prefix: "org:", Owner: owner},
	}})
	analysistest.Run(t, analysistest.TestData(), a,
		"example.com/svc/modules/iam", "example.com/svc/modules/iam/tests", "example.com/svc/modules/worker")
}
