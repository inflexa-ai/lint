package cleanup

import (
	"context"
	"log/slog"
)

func Run(ctx context.Context) {
	defer slog.InfoContext(ctx, "done") // want `the cleanup call takes the context ctx`
}
