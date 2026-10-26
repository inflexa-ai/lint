package semaphore

import "context"

type Weighted struct{}

func NewWeighted(n int64) *Weighted { return &Weighted{} }

func (s *Weighted) Acquire(ctx context.Context, n int64) error { return nil }
func (s *Weighted) TryAcquire(n int64) bool                    { return true }
func (s *Weighted) Release(n int64)                            {}
