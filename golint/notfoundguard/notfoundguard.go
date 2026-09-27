// Package notfoundguard reports a 404 answer that no check of the error kind
// guards, and a fallback 4xx answer that carries the text of an error.
package notfoundguard

import (
	"go/ast"
	"go/constant"
	"go/token"
	"go/types"
	"net/http"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/edge"
	"golang.org/x/tools/go/ast/inspector"
	"golang.org/x/tools/go/types/typeutil"
)

const (
	name = "notfoundguard"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/notfoundguard.md"
	doc  = `answer 404 only for an error that a check classified as not found

A call that passes http.StatusNotFound inside an error test (err != nil)
must sit under errors.Is, errors.As or a configured guard on that error.
Otherwise a database outage looks like a missing resource. A 4xx answer
after the guard branches must not carry the text of the unclassified error,
because internal messages then reach the client.`
)

// Settings configures the analyzer. Guards holds more guard functions as
// "<import path>.<name>", beside errors.Is and errors.As.
type Settings struct {
	Guards []string `json:"guards"`
}

func New(s Settings) *analysis.Analyzer {
	guards := map[string]bool{"errors.Is": true, "errors.As": true}
	for _, g := range s.Guards {
		guards[g] = true
	}
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, guards)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, guards map[string]bool) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	for cur := range insp.Root().Preorder((*ast.CallExpr)(nil)) {
		call := cur.Node().(*ast.CallExpr)
		status := statusArg(pass.TypesInfo, call)
		if status < 400 || status > 499 {
			continue
		}
		test, ok := findErrorTest(pass.TypesInfo, cur)
		if !ok {
			continue
		}
		c := checker{info: pass.TypesInfo, guards: guards, err: test.err}
		if c.guarded(test.conds) {
			continue
		}
		switch {
		case status == http.StatusNotFound:
			pass.Report(analysis.Diagnostic{
				Pos:     call.Pos(),
				End:     call.End(),
				Message: "a 404 answer must follow a check of the error kind: guard it with errors.Is or errors.As on the error, so that an outage does not look like a missing resource",
				URL:     url,
			})
		case c.hasGuardBranch(test.branch) && carriesError(pass.TypesInfo, call.Args):
			pass.Report(analysis.Diagnostic{
				Pos:     call.Pos(),
				End:     call.End(),
				Message: "a fallback 4xx answer carries the text of an unclassified error: answer 500 with a constant message and log the error, so that internal messages do not reach the client",
				URL:     url,
			})
		}
	}
}

// statusArg returns http.StatusNotFound when a direct argument of the call is
// that constant, else the first net/http status constant from 400 to 499, else 0.
func statusArg(info *types.Info, call *ast.CallExpr) int {
	found := 0
	for _, arg := range call.Args {
		var id *ast.Ident
		switch a := ast.Unparen(arg).(type) {
		case *ast.SelectorExpr:
			id = a.Sel
		case *ast.Ident:
			id = a
		default:
			continue
		}
		c, ok := info.Uses[id].(*types.Const)
		if !ok || c.Pkg() == nil || c.Pkg().Path() != "net/http" || c.Val().Kind() != constant.Int {
			continue
		}
		v, ok := constant.Int64Val(c.Val())
		switch {
		case !ok || v < 400 || v > 499:
		case v == http.StatusNotFound:
			return http.StatusNotFound
		case found == 0:
			found = int(v)
		}
	}
	return found
}

type errorTest struct {
	err    ast.Expr
	conds  []cond   // the conditions that hold where the call runs, up to and with the error test
	branch ast.Node // the block or case clause of the error test that holds the call
}

// cond is a condition that holds at the call: the disjunction of exprs, or its
// negation for the else branch of an if statement.
type cond struct {
	exprs   []ast.Expr
	negated bool
}

// findErrorTest walks from the call to the innermost enclosing if statement or
// switch case that compares an error with nil, within the same function. A
// condition counts only when the call is in its true branch.
func findErrorTest(info *types.Info, cur inspector.Cursor) (errorTest, bool) {
	var conds []cond
	for ; cur.Node() != nil; cur = cur.Parent() {
		switch cur.Node().(type) {
		case *ast.FuncDecl, *ast.FuncLit, *ast.File:
			return errorTest{}, false
		}
		switch cur.ParentEdgeKind() {
		case edge.IfStmt_Body, edge.IfStmt_Else:
			stmt := cur.Parent().Node().(*ast.IfStmt)
			negated := cur.ParentEdgeKind() == edge.IfStmt_Else
			conds = append(conds, cond{exprs: []ast.Expr{stmt.Cond}, negated: negated})
			if e := nonNilError(info, []ast.Expr{stmt.Cond}, negated); e != nil {
				return errorTest{err: e, conds: conds, branch: cur.Node()}, true
			}
		case edge.CaseClause_Body:
			clause := cur.Parent().Node().(*ast.CaseClause)
			if len(clause.List) == 0 {
				continue
			}
			conds = append(conds, cond{exprs: clause.List})
			if e := nonNilError(info, clause.List, false); e != nil {
				return errorTest{err: e, conds: conds, branch: clause}, true
			}
		}
	}
	return errorTest{}, false
}

// nonNilError returns an error value that each expression implies to be
// non-nil where it holds (or where it does not hold, when negated), or nil.
func nonNilError(info *types.Info, exprs []ast.Expr, negated bool) ast.Expr {
	for _, x := range exprs {
		for _, e := range nilComparisons(info, x) {
			c := checker{info: info, err: e}
			all := true
			for _, y := range exprs {
				all = all && c.impliesLeaf(y, negated, c.nonNilLeaf)
			}
			if all {
				return e
			}
		}
	}
	return nil
}

// nilComparisons returns the error operand of each comparison of an error with
// nil in the expression.
func nilComparisons(info *types.Info, x ast.Expr) []ast.Expr {
	var found []ast.Expr
	ast.Inspect(x, func(n ast.Node) bool {
		if _, ok := n.(*ast.FuncLit); ok {
			return false
		}
		if e, ok := nilOperand(info, n); ok {
			found = append(found, e)
		}
		return true
	})
	return found
}

// nilOperand returns the error operand of a comparison of an error with nil.
func nilOperand(info *types.Info, n ast.Node) (ast.Expr, bool) {
	b, ok := n.(*ast.BinaryExpr)
	if !ok || (b.Op != token.NEQ && b.Op != token.EQL) {
		return nil, false
	}
	switch {
	case isNil(info, b.Y) && isErrorInterface(info.TypeOf(b.X)):
		return b.X, true
	case isNil(info, b.X) && isErrorInterface(info.TypeOf(b.Y)):
		return b.Y, true
	}
	return nil, false
}

func isNil(info *types.Info, x ast.Expr) bool {
	tv, ok := info.Types[x]
	return ok && tv.IsNil()
}

type checker struct {
	info   *types.Info
	guards map[string]bool
	err    ast.Expr
}

// guarded reports whether one of the conditions implies a guard on the tested
// error.
func (c checker) guarded(conds []cond) bool {
	for _, cd := range conds {
		all := len(cd.exprs) > 0
		for _, x := range cd.exprs {
			all = all && c.implies(x, cd.negated)
		}
		if all {
			return true
		}
	}
	return false
}

// hasGuardBranch reports whether an if condition or a case expression inside
// the branch calls a guard on the tested error, in any polarity.
func (c checker) hasGuardBranch(branch ast.Node) bool {
	found := false
	ast.Inspect(branch, func(n ast.Node) bool {
		if found {
			return false
		}
		switch n := n.(type) {
		case *ast.FuncLit:
			return false
		case *ast.IfStmt:
			found = c.callsGuard(n.Cond)
		case *ast.CaseClause:
			if n != branch {
				for _, x := range n.List {
					found = found || c.callsGuard(x)
				}
			}
		}
		return true
	})
	return found
}

func (c checker) callsGuard(x ast.Expr) bool {
	found := false
	ast.Inspect(x, func(n ast.Node) bool {
		if call, ok := n.(*ast.CallExpr); ok && c.isGuard(call) {
			found = true
		}
		return !found
	})
	return found
}

// implies reports whether the expression, where it holds (or where it does
// not hold, when negated), makes a guard call on the tested error true.
func (c checker) implies(x ast.Expr, negated bool) bool {
	return c.impliesLeaf(x, negated, c.guardLeaf)
}

// impliesLeaf reports whether the expression, where it holds (or where it does
// not hold, when negated), makes the leaf true. Under an effective && one
// operand is enough; under an effective || each operand must imply the leaf.
func (c checker) impliesLeaf(x ast.Expr, negated bool, leaf func(ast.Expr, bool) bool) bool {
	x = ast.Unparen(x)
	switch y := x.(type) {
	case *ast.UnaryExpr:
		if y.Op == token.NOT {
			return c.impliesLeaf(y.X, !negated, leaf)
		}
	case *ast.BinaryExpr:
		switch y.Op {
		case token.LAND, token.LOR:
			if (y.Op == token.LAND) != negated {
				return c.impliesLeaf(y.X, negated, leaf) || c.impliesLeaf(y.Y, negated, leaf)
			}
			return c.impliesLeaf(y.X, negated, leaf) && c.impliesLeaf(y.Y, negated, leaf)
		case token.EQL, token.NEQ:
			if b, ok := c.boolConst(y.Y); ok {
				return c.impliesLeaf(y.X, negated != (b == (y.Op == token.NEQ)), leaf)
			}
			if b, ok := c.boolConst(y.X); ok {
				return c.impliesLeaf(y.Y, negated != (b == (y.Op == token.NEQ)), leaf)
			}
		}
	}
	return leaf(x, negated)
}

func (c checker) guardLeaf(x ast.Expr, negated bool) bool {
	call, ok := x.(*ast.CallExpr)
	return ok && c.isGuard(call) && !negated
}

func (c checker) nonNilLeaf(x ast.Expr, negated bool) bool {
	e, ok := nilOperand(c.info, x)
	return ok && (e == c.err || c.sameError(e)) && (x.(*ast.BinaryExpr).Op == token.NEQ) != negated
}

func (c checker) boolConst(x ast.Expr) (bool, bool) {
	tv, ok := c.info.Types[x]
	if !ok || tv.Value == nil || tv.Value.Kind() != constant.Bool {
		return false, false
	}
	return constant.BoolVal(tv.Value), true
}

func (c checker) isGuard(call *ast.CallExpr) bool {
	fn := typeutil.StaticCallee(c.info, call)
	if fn == nil || fn.Pkg() == nil || !c.guards[fn.Pkg().Path()+"."+fn.Name()] {
		return false
	}
	for _, arg := range call.Args {
		if c.sameError(arg) {
			return true
		}
	}
	return false
}

func (c checker) sameError(x ast.Expr) bool {
	return sameValue(c.info, x, c.err)
}

// sameValue reports whether two expressions name the same variable: an
// identifier by its object, a selector by the selected object and by the same
// test on its receiver. Any other shape does not match.
func sameValue(info *types.Info, a, b ast.Expr) bool {
	switch x := ast.Unparen(a).(type) {
	case *ast.Ident:
		y, ok := ast.Unparen(b).(*ast.Ident)
		return ok && info.ObjectOf(x) != nil && info.ObjectOf(x) == info.ObjectOf(y)
	case *ast.SelectorExpr:
		y, ok := ast.Unparen(b).(*ast.SelectorExpr)
		return ok && info.ObjectOf(x.Sel) != nil && info.ObjectOf(x.Sel) == info.ObjectOf(y.Sel) && sameValue(info, x.X, y.X)
	}
	return false
}

// carriesError reports whether an argument holds, at any depth, a value whose
// type is an error interface.
func carriesError(info *types.Info, args []ast.Expr) bool {
	found := false
	for _, arg := range args {
		ast.Inspect(arg, func(n ast.Node) bool {
			if found {
				return false
			}
			if x, ok := n.(ast.Expr); ok && isErrorInterface(info.TypeOf(x)) {
				found = true
			}
			return true
		})
	}
	return found
}

func isErrorInterface(t types.Type) bool {
	if t == nil || !types.IsInterface(t) {
		return false
	}
	return types.Implements(t, types.Universe.Lookup("error").Type().Underlying().(*types.Interface))
}
