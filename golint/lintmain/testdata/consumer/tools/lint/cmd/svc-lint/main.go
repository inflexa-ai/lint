// Command svc-lint is golangci-lint with the plugins of this repository
// compiled in.
package main

import (
	_ "example.com/svc/tools/lint/plugin"
	_ "github.com/inflexa-ai/lint/golint/plugin"

	"github.com/inflexa-ai/lint/golint/lintmain"
)

func main() {
	lintmain.Run()
}
