package lintmain

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime/debug"
	"testing"
	"time"
)

func TestVersionFromBuildInfo(t *testing.T) {
	bi := &debug.BuildInfo{
		Main:      debug.Module{Path: "example.com/svc/tools", Version: "(devel)"},
		GoVersion: "go1.27.1",
		Deps: []*debug.Module{
			{Path: "github.com/golangci/golangci-lint/v2", Version: "v2.14.0"},
			{Path: "github.com/inflexa-ai/lint/golint", Version: "v0.1.0"},
		},
	}
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	v, err := version(bi, exe)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`v2\.14\.0\+golint\.v0\.1\.0\+bin\.[0-9a-f]{16}$`).MatchString(v) {
		t.Errorf("version = %q; want v2.14.0+golint.v0.1.0+bin. and 16 hex characters", v)
	}
}

func TestVersionWithoutBuildInfo(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	v, err := version(nil, exe)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`\(devel\)\+bin\.[0-9a-f]{16}$`).MatchString(v) {
		t.Errorf("version = %q; want (devel)+bin. and 16 hex characters", v)
	}
}

func TestFingerprintOfTheTestBinary(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	first, err := fingerprint(exe)
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[0-9a-f]{16}$`).MatchString(first) {
		t.Errorf("fingerprint = %q; want 16 hex characters", first)
	}
	second, err := fingerprint(exe)
	if err != nil {
		t.Fatal(err)
	}
	if first != second {
		t.Errorf("fingerprint changed between calls: %q then %q", first, second)
	}
}

func TestFingerprintOfAMissingPath(t *testing.T) {
	if _, err := fingerprint(filepath.Join(t.TempDir(), "absent")); err == nil {
		t.Error("fingerprint of a missing path gave no error")
	}
}

func TestFingerprintCost(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(exe)
	if err != nil {
		t.Fatal(err)
	}
	start := time.Now()
	bin, err := fingerprint(exe)
	if err != nil {
		t.Fatal(err)
	}
	elapsed := time.Since(start)
	t.Logf("hashed %d bytes of %s in %s: %s", info.Size(), exe, elapsed, bin)
	if elapsed > time.Second {
		t.Errorf("the hash of the %d byte binary took %s; the bound is 1s", info.Size(), elapsed)
	}
}
