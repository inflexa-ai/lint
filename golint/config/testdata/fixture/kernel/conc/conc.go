package conc

import "context"

func ParallelMap[T, R any](ctx context.Context, items []T, n uint, fn func(context.Context, T) R) []R {
	out := make([]R, 0, len(items))
	for _, item := range items {
		out = append(out, fn(ctx, item))
	}
	return out
}
