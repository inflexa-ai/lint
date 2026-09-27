package swagsync_test

import (
	"testing"

	"golang.org/x/tools/go/analysis/analysistest"

	"github.com/inflexa-ai/lint/golint/swagsync"
)

func TestAnalyzer(t *testing.T) {
	a := swagsync.New(swagsync.Settings{RegisterMethods: []string{"HandleGET", "HandlePOST"}})
	analysistest.Run(t, analysistest.TestData(), a, "example.com/svc/handler/probe", "example.com/svc/handler/v1")
}
