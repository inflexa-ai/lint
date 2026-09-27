package conc

import (
	"context"
	"testing"
)

func TestParallelMap(t *testing.T) {
	if got := ParallelMap(t.Context(), []int{1}, 1, func(_ context.Context, v int) int { return v }); len(got) != 1 {
		t.Fatal(got)
	}
}
