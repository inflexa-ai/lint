package iam

import (
	"context"
	"sync"

	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/semaphore"
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
		go func() { // want `a goroutine inside a loop starts one goroutine for each element`
			defer wg.Done()
			go func() {}() // want `a goroutine inside a loop`
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

func NoLimit(ctx context.Context, grants []Grant) error {
	var g errgroup.Group
	g.SetLimit(-1)
	for _, grant := range grants {
		g.Go(func() error { return check(ctx, grant) }) // want `errgroup.Group.Go inside a loop`
	}
	return g.Wait()
}

func ZeroLimit(ctx context.Context, grants []Grant, n int) error {
	var g, h errgroup.Group
	g.SetLimit(0)
	h.SetLimit(n)
	for _, grant := range grants {
		g.Go(func() error { return check(ctx, grant) }) // want `errgroup.Group.Go inside a loop`
		// A width that the caller computes is a bound: only a constant at or below zero removes it.
		h.Go(func() error { return check(ctx, grant) })
	}
	_ = h.Wait()
	return g.Wait()
}

const workers = 4

func ConstLimit(ctx context.Context, grants []Grant) error {
	var g errgroup.Group
	g.SetLimit(workers)
	for _, grant := range grants {
		g.TryGo(func() error { return check(ctx, grant) })
	}
	return g.Wait()
}

func TryUnbounded(ctx context.Context, grants []Grant) error {
	var g errgroup.Group
	for _, grant := range grants {
		g.TryGo(func() error { return check(ctx, grant) }) // want `errgroup.Group.TryGo inside a loop`
	}
	return g.Wait()
}

func WaitGroupGo(ctx context.Context, grants []Grant) {
	var wg sync.WaitGroup
	for _, grant := range grants {
		wg.Go(func() { _ = check(ctx, grant) }) // want `a goroutine inside a loop starts one goroutine for each element`
	}
	wg.Wait()
}

func WaitGroupGoNoWait(ctx context.Context) {
	var wg sync.WaitGroup
	wg.Go(func() { _ = check(ctx, Grant{}) }) // want `a goroutine with no join and no stop`
}

func WaitGroupGoJoined(ctx context.Context) {
	var wg sync.WaitGroup
	wg.Go(func() { _ = check(ctx, Grant{}) })
	wg.Wait()
}

func ChannelSemaphore(ctx context.Context, grants []Grant) {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for _, grant := range grants {
		sem <- struct{}{}
		wg.Go(func() {
			defer func() { <-sem }()
			_ = check(ctx, grant)
		})
	}
	wg.Wait()
}

func ChannelSemaphoreGo(ctx context.Context, grants []Grant) {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for _, grant := range grants {
		sem <- struct{}{}
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() { <-sem }()
			_ = check(ctx, grant)
		}()
	}
	wg.Wait()
}

func SendInsideGoroutine(ctx context.Context, grants []Grant) {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for _, grant := range grants {
		wg.Go(func() { // want `a goroutine inside a loop`
			sem <- struct{}{}
			defer func() { <-sem }()
			_ = check(ctx, grant)
		})
	}
	wg.Wait()
}

func SendAfterSpawn(ctx context.Context, grants []Grant) {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8)
	for _, grant := range grants {
		wg.Go(func() { _ = check(ctx, grant) }) // want `a goroutine inside a loop`
		sem <- struct{}{}
	}
	wg.Wait()
}

func WeightedSemaphore(ctx context.Context, grants []Grant) error {
	var g errgroup.Group
	sem := semaphore.NewWeighted(8)
	for _, grant := range grants {
		if err := sem.Acquire(ctx, 1); err != nil {
			return err
		}
		g.Go(func() error {
			defer sem.Release(1)
			return check(ctx, grant)
		})
	}
	return g.Wait()
}

func Workers(ctx context.Context, jobs chan Grant) {
	var wg sync.WaitGroup
	for range workers {
		wg.Go(func() {
			for j := range jobs {
				_ = check(ctx, j)
			}
		})
	}
	for i := 0; i < 4; i++ {
		wg.Go(func() {})
	}
	wg.Wait()
}

func NestedWorkers(ctx context.Context, grants []Grant) {
	var wg sync.WaitGroup
	for range grants {
		for range workers {
			wg.Go(func() {}) // want `a goroutine inside a loop`
		}
	}
	wg.Wait()
}

func Unjoined(grants []Grant) {
	for range grants {
		go func() {}() // want `a goroutine inside a loop` `a goroutine with no join and no stop`
	}
}
