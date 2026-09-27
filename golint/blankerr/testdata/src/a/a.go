package a

import (
	"encoding/json"
	"os"
)

type env struct{}

func f() error              { return nil }
func pair() (int, error)    { return 0, nil }
func count() (int, bool)    { return 0, true }
func handle(_ error, n int) {}

func discards(f2 *os.File, raw []byte) {
	_ = f() // want `the error is discarded without a reason`

	n, _ := pair() // want `the error is discarded without a reason`
	n, _ = pair()  // want `the error is discarded without a reason`

	err := f()
	_ = err // want `the error is discarded without a reason`

	var e env
	_ = json.Unmarshal(raw, &e) // want `the error is discarded without a reason`

	// SAFETY: the file was opened read-only,
	// thus Close cannot lose data
	_ = f2.Close()

	// SAFETY: this comment is followed by a blank line

	_ = f() // want `the error is discarded without a reason`

	// safety: the marker is case-sensitive
	_ = f() // want `the error is discarded without a reason`

	/* SAFETY: a block comment also counts */
	_ = f()

	for _, b := range raw {
		_ = b
	}
	_, ok := count()
	_ = ok
	_ = n
	handle(nil, n)
}
