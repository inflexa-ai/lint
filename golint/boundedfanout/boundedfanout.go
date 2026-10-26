// Package boundedfanout reports unbounded fan-out and a goroutine without a
// lifecycle or a join.
package boundedfanout

import (
	"go/ast"
	"go/constant"
	"go/token"
	"go/types"
	"slices"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/edge"
	"golang.org/x/tools/go/ast/inspector"
	"golang.org/x/tools/go/types/typeutil"
)

const (
	name = "boundedfanout"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/boundedfanout.md"
	doc  = `bound each fan-out, and give each goroutine a join or a stop

A goroutine inside a loop starts one goroutine for each element and must
have a bound: a SetLimit on the errgroup.Group that is not a constant at or below zero, a
semaphore acquire before the goroutine, or a loop with a constant count. A go
statement or a sync.WaitGroup.Go outside the approved packages must sit in a
constructor or a start method of a type with a stop method, or in a function
that waits on a sync.WaitGroup or an errgroup.Group. Otherwise the goroutine
outlives its caller with nothing to stop it.`

	errgroupPath    = "golang.org/x/sync/errgroup"
	semaphorePath   = "golang.org/x/sync/semaphore"
	loopMessage     = "a goroutine inside a loop starts one goroutine for each element: use an errgroup.Group with SetLimit, or acquire a semaphore before the goroutine"
	unjoinedMessage = "a goroutine with no join and no stop: wait for it with a bounded errgroup.Group or sync.WaitGroup, or start it from a type with a Stop method"
)

// Settings configures the analyzer. A nil list gives the default; an empty
// list gives an empty set.
type Settings struct {
	AllowedPackages []string `json:"allowed-packages"`
	StopMethods     []string `json:"stop-methods"`
	StartMethods    []string `json:"start-methods"`
}

func New(s Settings) *analysis.Analyzer {
	c := config{
		allowed: s.AllowedPackages,
		stop:    orDefault(s.StopMethods, []string{"Stop", "Close", "Shutdown"}),
		start:   orDefault(s.StartMethods, []string{"Start", "Run"}),
	}
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run: func(pass *analysis.Pass) (any, error) {
			c.run(pass)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func orDefault(list, def []string) []string {
	if list == nil {
		return def
	}
	return list
}

type config struct {
	allowed, stop, start []string
}

func (c config) run(pass *analysis.Pass) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	allowed := slices.ContainsFunc(c.allowed, func(p string) bool { return strings.HasPrefix(pass.Pkg.Path(), p) })
	report := func(n ast.Node, msg string) {
		pass.Report(analysis.Diagnostic{Pos: n.Pos(), End: n.End(), Message: msg, URL: url})
	}
	for cur := range insp.Root().Preorder((*ast.CallExpr)(nil), (*ast.GoStmt)(nil)) {
		if call, ok := cur.Node().(*ast.CallExpr); ok {
			if group, method, ok := groupGo(pass.TypesInfo, call); ok {
				if inLoop(cur) && !hasSetLimit(pass.TypesInfo, enclosingDecl(cur), group) && !bounded(pass.TypesInfo, cur) {
					report(call, "errgroup.Group."+method+" inside a loop starts one goroutine for each element: call SetLimit on the group before the loop, with a width above zero")
				}
				continue
			}
			if !isMethod(pass.TypesInfo, call, "sync", "WaitGroup", "Go") {
				continue
			}
		}
		if allowed {
			continue
		}
		if inLoop(cur) && !bounded(pass.TypesInfo, cur) {
			report(cur.Node(), loopMessage)
		}
		if !c.exempt(pass, enclosingDecl(cur)) {
			report(cur.Node(), unjoinedMessage)
		}
	}
}

func groupGo(info *types.Info, call *ast.CallExpr) (ast.Expr, string, bool) {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return nil, "", false
	}
	for _, method := range []string{"Go", "TryGo"} {
		if isMethod(info, call, errgroupPath, "Group", method) {
			return sel.X, method, true
		}
	}
	return nil, "", false
}

func isMethod(info *types.Info, call *ast.CallExpr, pkg, typ, method string) bool {
	fn := typeutil.StaticCallee(info, call)
	if fn == nil || fn.Name() != method {
		return false
	}
	recv := fn.Signature().Recv()
	return recv != nil && isNamed(recv.Type(), pkg, typ)
}

func isNamed(t types.Type, pkg, typ string) bool {
	if p, ok := t.(*types.Pointer); ok {
		t = p.Elem()
	}
	named, ok := t.(*types.Named)
	return ok && named.Obj().Pkg() != nil && named.Obj().Pkg().Path() == pkg && named.Obj().Name() == typ
}

func inLoop(cur inspector.Cursor) bool {
	return len(loops(cur)) > 0
}

// loops returns the for and range statements of the same function
// declaration whose body encloses the cursor, through any function literal,
// the innermost first.
func loops(cur inspector.Cursor) []ast.Stmt {
	var out []ast.Stmt
	for ; cur.Node() != nil; cur = cur.Parent() {
		switch cur.Node().(type) {
		case *ast.FuncDecl, *ast.File:
			return out
		}
		switch cur.ParentEdgeKind() {
		case edge.ForStmt_Body, edge.RangeStmt_Body:
			// The parent of a for body or a range body is a for or range statement.
			out = append(out, cur.Parent().Node().(ast.Stmt))
		}
	}
	return out
}

// bounded reports whether each enclosing loop has a constant count, or the
// innermost loop acquires a semaphore before the goroutine.
func bounded(info *types.Info, cur inspector.Cursor) bool {
	ls := loops(cur)
	if len(ls) == 0 {
		return true
	}
	if !slices.ContainsFunc(ls, func(l ast.Stmt) bool { return !constantCount(info, l) }) {
		return true
	}
	var body *ast.BlockStmt
	switch l := ls[0].(type) {
	case *ast.ForStmt:
		body = l.Body
	case *ast.RangeStmt:
		body = l.Body
	}
	return acquires(info, body, cur.Node())
}

func constantCount(info *types.Info, loop ast.Stmt) bool {
	switch l := loop.(type) {
	case *ast.RangeStmt:
		return isConstInt(info, l.X)
	case *ast.ForStmt:
		cond, ok := l.Cond.(*ast.BinaryExpr)
		return ok && (cond.Op == token.LSS || cond.Op == token.LEQ) && isConstInt(info, cond.Y)
	}
	return false
}

func isConstInt(info *types.Info, x ast.Expr) bool {
	tv, ok := info.Types[x]
	return ok && tv.Value != nil && tv.Value.Kind() == constant.Int
}

// acquires reports whether the body sends on a channel or acquires a
// semaphore.Weighted before the spawn. A function literal counts only when it
// encloses the spawn, because an acquire inside the goroutine does not stop
// the loop from starting it.
func acquires(info *types.Info, body *ast.BlockStmt, spawn ast.Node) bool {
	found := false
	ast.Inspect(body, func(n ast.Node) bool {
		if found || n == nil || n.Pos() >= spawn.Pos() {
			return false
		}
		switch n := n.(type) {
		case *ast.FuncLit:
			return n.End() >= spawn.End()
		case *ast.SendStmt:
			found = true
		case *ast.CallExpr:
			found = isMethod(info, n, semaphorePath, "Weighted", "Acquire") || isMethod(info, n, semaphorePath, "Weighted", "TryAcquire")
		}
		return !found
	})
	return found
}

func enclosingDecl(cur inspector.Cursor) *ast.FuncDecl {
	for enc := range cur.Enclosing((*ast.FuncDecl)(nil)) {
		return enc.Node().(*ast.FuncDecl)
	}
	return nil
}

func hasSetLimit(info *types.Info, decl *ast.FuncDecl, group ast.Expr) bool {
	if decl == nil || decl.Body == nil {
		return false
	}
	found := false
	ast.Inspect(decl.Body, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if found || !ok {
			return !found
		}
		if sel, ok := call.Fun.(*ast.SelectorExpr); ok && isMethod(info, call, errgroupPath, "Group", "SetLimit") && sameObject(info, sel.X, group) {
			found = limits(info, call.Args[0])
		}
		return true
	})
	return found
}

// limits reports whether SetLimit(x) bounds the group. A negative value
// removes the limit and zero blocks each Go, so a constant must be above zero.
// A width that the code computes, such as runtime.NumCPU(), counts as a bound.
func limits(info *types.Info, x ast.Expr) bool {
	tv, ok := info.Types[x]
	return !ok || tv.Value == nil || constant.Sign(tv.Value) > 0
}

// sameObject reports whether two expressions name the same group. For a
// field selector the receivers must also match, because each instance of a
// struct shares the field object.
func sameObject(info *types.Info, a, b ast.Expr) bool {
	a, b = ast.Unparen(a), ast.Unparen(b)
	if sa, ok := a.(*ast.SelectorExpr); ok {
		sb, ok := b.(*ast.SelectorExpr)
		return ok && info.ObjectOf(sa.Sel) == info.ObjectOf(sb.Sel) && sameObject(info, sa.X, sb.X)
	}
	if ua, ok := a.(*ast.UnaryExpr); ok {
		a = ua.X
	}
	if ub, ok := b.(*ast.UnaryExpr); ok {
		b = ub.X
	}
	if sa, ok := a.(*ast.StarExpr); ok {
		a = sa.X
	}
	if sb, ok := b.(*ast.StarExpr); ok {
		b = sb.X
	}
	ia, aok := a.(*ast.Ident)
	ib, bok := b.(*ast.Ident)
	if aok && bok {
		return info.ObjectOf(ia) != nil && info.ObjectOf(ia) == info.ObjectOf(ib)
	}
	return types.ExprString(a) == types.ExprString(b)
}

// exempt reports whether the function declaration is a constructor or a start
// method of a type with a stop method, or waits for its goroutines.
func (c config) exempt(pass *analysis.Pass, decl *ast.FuncDecl) bool {
	if decl == nil {
		return false
	}
	fn, ok := pass.TypesInfo.Defs[decl.Name].(*types.Func)
	if !ok {
		return false
	}
	sig := fn.Signature()
	for i := range sig.Results().Len() {
		if c.hasStop(pass.Pkg, sig.Results().At(i).Type()) {
			return true
		}
	}
	if recv := sig.Recv(); recv != nil && slices.Contains(c.start, fn.Name()) && c.hasStop(pass.Pkg, recv.Type()) {
		return true
	}
	return waits(pass.TypesInfo, decl)
}

func (c config) hasStop(pkg *types.Package, t types.Type) bool {
	if p, ok := t.(*types.Pointer); ok {
		t = p.Elem()
	}
	named, ok := t.(*types.Named)
	if !ok || named.Obj().Pkg() != pkg {
		return false
	}
	for _, m := range c.stop {
		if obj, _, _ := types.LookupFieldOrMethod(types.NewPointer(named), true, pkg, m); obj != nil {
			if _, ok := obj.(*types.Func); ok {
				return true
			}
		}
	}
	return false
}

func waits(info *types.Info, decl *ast.FuncDecl) bool {
	if decl.Body == nil {
		return false
	}
	found := false
	ast.Inspect(decl.Body, func(n ast.Node) bool {
		if call, ok := n.(*ast.CallExpr); ok && !found {
			found = isMethod(info, call, "sync", "WaitGroup", "Wait") || isMethod(info, call, errgroupPath, "Group", "Wait")
		}
		return !found
	})
	return found
}
