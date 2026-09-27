// Command inflexa-lint is golangci-lint with the golint plugins compiled in.
package main

import (
	"fmt"
	"os"
	"runtime/debug"

	"github.com/golangci/golangci-lint/v2/pkg/commands"

	_ "github.com/inflexa-ai/lint/golint/plugin"
)

func main() {
	info := commands.BuildInfo{Version: "(devel)", Commit: "?", Date: "(unknown)", GoVersion: "unknown"}
	if bi, ok := debug.ReadBuildInfo(); ok {
		versions := map[string]string{bi.Main.Path: bi.Main.Version}
		for _, d := range bi.Deps {
			versions[d.Path] = d.Version
		}
		info.GoVersion = bi.GoVersion
		// golangci-lint salts its cache with this string, thus a new golint release invalidates the cached issues.
		info.Version = versions["github.com/golangci/golangci-lint/v2"] + "+golint." + versions["github.com/inflexa-ai/lint/golint"]
	}
	if err := commands.Execute(info); err != nil {
		fmt.Fprintf(os.Stderr, "The command is terminated due to an error: %v\n", err)
		os.Exit(1)
	}
}
