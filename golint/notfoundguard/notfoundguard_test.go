package notfoundguard_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/notfoundguard"
)

func TestAnalyzer(t *testing.T) {
	a := notfoundguard.New(notfoundguard.Settings{Guards: []string{"example.com/svc/kernel/pgerr.IsNotFound"}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/handler/mount")
}

func TestNoGuards(t *testing.T) {
	analysistest.Run(t, analysistest.TestData(), notfoundguard.Analyzer, "example.com/svc/handler/noguards")
}
