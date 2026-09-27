// Package lintmain runs golangci-lint with each plugin that the program
// imports. A main package imports golint/plugin and the plugin packages of
// its repository and calls Run, in place of a copy of cmd/inflexa-lint.
package lintmain

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"runtime/debug"

	"github.com/golangci/golangci-lint/v2/pkg/commands"
)

// Run runs golangci-lint with each plugin that the program imports. On an
// error of the version build or of Execute, Run prints the error to the
// standard error stream and exits with status 1.
func Run() {
	exe, err := os.Executable()
	if err != nil {
		terminate(err)
	}
	bi, _ := debug.ReadBuildInfo()
	v, err := version(bi, exe)
	if err != nil {
		terminate(err)
	}
	goVersion := "unknown"
	if bi != nil {
		goVersion = bi.GoVersion
	}
	if err := commands.Execute(commands.BuildInfo{Version: v, Commit: "?", Date: "(unknown)", GoVersion: goVersion}); err != nil {
		terminate(err)
	}
}

// version puts the two module versions and the fingerprint into the version
// string. golangci-lint salts its lint cache with this string, thus a change
// of any rule in the binary, also a rule without a module version, clears the
// cached issues.
func version(bi *debug.BuildInfo, exe string) (string, error) {
	bin, err := fingerprint(exe)
	if err != nil {
		return "", err
	}
	if bi == nil {
		return "(devel)+bin." + bin, nil
	}
	versions := map[string]string{bi.Main.Path: bi.Main.Version}
	for _, d := range bi.Deps {
		versions[d.Path] = d.Version
	}
	return versions["github.com/golangci/golangci-lint/v2"] +
		"+golint." + versions["github.com/inflexa-ai/lint/golint"] +
		"+bin." + bin, nil
}

// fingerprint is the first 16 hex characters of SHA-256 of the file at exe.
func fingerprint(exe string) (string, error) {
	f, err := os.Open(exe)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)[:8]), nil
}

func terminate(err error) {
	fmt.Fprintf(os.Stderr, "The command is terminated due to an error: %v\n", err)
	os.Exit(1)
}
