package iam

import (
	"context"
	"log/slog"

	"example.com/fixture/kernel/conc"
)

const Prefix = "iam:"

func load() error { return nil }

func Load(ctx context.Context, ids []string) []string {
	if err := load(); err != nil {
		slog.Error("load failed", "err", err)
	}
	_ = load()
	return conc.ParallelMap(ctx, ids, 0, func(_ context.Context, id string) string { return id })
}
