//go:build ruleguard

package gorules

import "github.com/quasilyte/go-ruleguard/dsl"

func pathIDParse(m dsl.Matcher) {
	m.Match(`uuid.Parse($r.PathValue($_))`).
		Where(m.File().Imports(`github.com/google/uuid`) && m["r"].Type.Is(`*http.Request`)).
		Report(`parse a path ID with one generic helper, so that each handler answers a bad ID the same way`)
}

func concZeroBound(m dsl.Matcher) {
	m.Match(`conc.ParallelMap($_, $_, $n, $_)`, `conc.ParallelMap[$_, $_]($_, $_, $n, $_)`).
		Where(m["n"].Const && m["n"].Value.Int() == 0 && m.File().Imports(`example.com/fixture/kernel/conc`)).
		At(m["n"]).
		Report(`the bound 0 starts one goroutine for each item: pass a positive bound`)
}

func truncateInTest(m dsl.Matcher) {
	m.Match(
		`$_($s, $*_)`, `$_($_, $s, $*_)`, `$_($_, $_, $s, $*_)`,
		`$_ := $s`, `$_ = $s`, `var $_ = $s`, `const $_ = $s`, `return $s`,
	).
		Where(m["s"].Node.Is(`BasicLit`) &&
			m["s"].Text.Matches(`(?i)\bTRUNCATE\b`) &&
			m.File().Name.Matches(`_test\.go$`)).
		At(m["s"]).
		Report(`a hand-written TRUNCATE list goes stale when a table is added: reset the database through a helper`)
}
