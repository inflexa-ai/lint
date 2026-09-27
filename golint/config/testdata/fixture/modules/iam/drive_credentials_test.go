package iam

import "testing"

func TestLoad(t *testing.T) {
	if got := Load(t.Context(), []string{"a"}); len(got) != 1 {
		t.Fatal(got)
	}
}
