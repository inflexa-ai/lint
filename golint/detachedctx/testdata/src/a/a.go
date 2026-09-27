package a

import (
	"context"
	"log/slog"
	"time"
)

type Storage interface {
	Delete(ctx context.Context, bucket, key string) error
}

type Tx struct{}

func (Tx) AfterCommit(fn func()) {}
func (Tx) OnRollback(fn func())  {}
func (Tx) Other(fn func())       {}

type Invalidator interface {
	Invalidate(ctx context.Context, key string)
}

func unsubscribe(ctx context.Context) {}

func Upload(ctx context.Context, storage Storage, bucket, key string) {
	defer func() {
		if err := storage.Delete(ctx, bucket, key); err != nil { // want `the cleanup call takes the context ctx`
			slog.ErrorContext(ctx, "failed", "error", err)
			slog.Error("failed", "error", err)
		}
	}()
	defer unsubscribe(ctx) // want `the cleanup call takes the context ctx`
}

func Detached(ctx context.Context, storage Storage, inv Invalidator, tx Tx, t time.Duration) {
	dctx := context.WithoutCancel(ctx)
	tctx, cancel := context.WithTimeout(dctx, t)
	defer cancel()
	defer func() {
		_ = storage.Delete(tctx, "b", "k")
		_ = storage.Delete(dctx, "b", "k")
	}()
	bg := context.Background()
	defer unsubscribe(bg)
	tx.AfterCommit(func() {
		d := context.WithoutCancel(ctx)
		d2, cancel := context.WithTimeout(d, t)
		defer cancel()
		inv.Invalidate(d2, "key")
	})
}

func Hooks(ctx context.Context, inv Invalidator, tx Tx, t time.Duration) {
	tx.AfterCommit(func() {
		inv.Invalidate(ctx, "key") // want `the cleanup call takes the context ctx`
	})
	tx.OnRollback(func() {
		inv.Invalidate(ctx, "key")
	})
	tx.Other(func() {
		inv.Invalidate(ctx, "key")
	})
	tx.AfterCommit(func() {
		c, cancel := context.WithTimeout(ctx, t) // want `the cleanup call takes the context ctx`
		defer cancel()
		inv.Invalidate(c, "key")
	})
	derived := context.WithValue(ctx, "k", 1)
	defer unsubscribe(derived) // want `the cleanup call takes the context derived`
}

func Outside(ctx context.Context, inv Invalidator) {
	inv.Invalidate(ctx, "key")
	defer func(c context.Context) {
		inv.Invalidate(c, "key")
	}(context.WithoutCancel(ctx))
}

func load(ctx context.Context) string { return "" }

func cleanup(key string) {}

func ArgumentsRunAtOnce(ctx context.Context) {
	defer cleanup(load(ctx))
	defer func(k string) {
		unsubscribe(ctx) // want `the cleanup call takes the context ctx`
	}(load(ctx))
}

type requestContext = context.Context

func Parenthesized(ctx context.Context, inv Invalidator, tx Tx) {
	defer (func() {
		unsubscribe(ctx) // want `the cleanup call takes the context ctx`
	})()
	tx.AfterCommit((func() {
		inv.Invalidate(ctx, "key") // want `the cleanup call takes the context ctx`
	}))
}

func Aliased(ctx requestContext) {
	defer unsubscribe(ctx) // want `the cleanup call takes the context ctx`
}
