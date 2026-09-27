package iam

import (
	"context"
	"sync"

	"golang.org/x/sync/errgroup"
)

type Grant struct{}

func check(ctx context.Context, g Grant) error { return nil }

func Unbounded(ctx context.Context, grants []Grant) error {
	g, gCtx := errgroup.WithContext(ctx)
	for _, grant := range grants {
		g.Go(func() error { return check(gCtx, grant) }) // want `errgroup.Group.Go inside a loop`
	}
	return g.Wait()
}

func UnboundedFor(ctx context.Context, grants []Grant) error {
	var g errgroup.Group
	for i := 0; i < len(grants); i++ {
		func() {
			g.Go(func() error { return check(ctx, grants[i]) }) // want `errgroup.Group.Go inside a loop`
		}()
	}
	return g.Wait()
}

func Bounded(ctx context.Context, grants []Grant) error {
	g, gCtx := errgroup.WithContext(ctx)
	g.SetLimit(8)
	for _, grant := range grants {
		g.Go(func() error { return check(gCtx, grant) })
	}
	return g.Wait()
}

func OtherGroupLimited(ctx context.Context, grants []Grant) error {
	var g, h errgroup.Group
	h.SetLimit(8)
	for _, grant := range grants {
		g.Go(func() error { return check(ctx, grant) }) // want `errgroup.Group.Go inside a loop`
	}
	_ = h.Wait()
	return g.Wait()
}

func Single(ctx context.Context) error {
	var g errgroup.Group
	g.Go(func() error { return nil })
	return g.Wait()
}

type PricingResolver struct{}

func (r *PricingResolver) refreshLoop() {}

func NewPricingResolver() *PricingResolver {
	r := &PricingResolver{}
	go r.refreshLoop() // want `a goroutine with no join and no stop`
	return r
}

type Broker struct{}

func NewBroker() *Broker {
	b := &Broker{}
	go b.run()
	return b
}

func (b *Broker) run() {}

func (b *Broker) Start(ctx context.Context) {
	go b.run()
}

func (b *Broker) Stop() {}

type Service struct{}

func (s *Service) Notify(ctx context.Context) {
	go func() { // want `a goroutine with no join and no stop`
		_ = check(ctx, Grant{})
	}()
}

func (s *Service) Start() {
	go func() {}() // want `a goroutine with no join and no stop`
}

func Haul(items []Grant) {
	var wg sync.WaitGroup
	for range items {
		wg.Add(1)
		go func() {
			defer wg.Done()
			go func() {}()
		}()
	}
	wg.Wait()
}

var start = func(g *errgroup.Group, work func() error) {
	g.Go(work)
}

type worker struct {
	group errgroup.Group
}

func TwoInstances(a, b *worker, grants []Grant) error {
	a.group.SetLimit(8)
	for range grants {
		b.group.Go(func() error { return nil }) // want `errgroup.Group.Go inside a loop`
		a.group.Go(func() error { return nil })
	}
	_ = a.group.Wait()
	return b.group.Wait()
}
