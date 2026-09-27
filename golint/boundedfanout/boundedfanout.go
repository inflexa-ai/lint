// Package boundedfanout reports unbounded fan-out and a goroutine without a
// lifecycle or a join.
package boundedfanout

import (
	"go/ast"
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

errgroup.Group.Go inside a loop starts one goroutine for each element and
must have a SetLimit on the group. A go statement outside the approved
packages must sit in a constructor or a start method of a type with a stop
method, or in a function that waits on a sync.WaitGroup or an errgroup.Group.
Otherwise the goroutine outlives its caller with nothing to stop it.`

	errgroupPath = "golang.org/x/sync/errgroup"
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
	for cur := range insp.Root().Preorder((*ast.CallExpr)(nil), (*ast.GoStmt)(nil)) {
		switch n := cur.Node().(type) {
		case *ast.CallExpr:
			if group, ok := groupGo(pass.TypesInfo, n); ok && inLoop(cur) && !hasSetLimit(pass.TypesInfo, enclosingDecl(cur), group) {
				pass.Report(analysis.Diagnostic{
					Pos:     n.Pos(),
					End:     n.End(),
					Message: "errgroup.Group.Go inside a loop starts one goroutine for each element: call SetLimit on the group before the loop",
					URL:     url,
				})
			}
		case *ast.GoStmt:
			if allowed || c.exempt(pass, enclosingDecl(cur)) {
				continue
			}
			pass.Report(analysis.Diagnostic{
				Pos:     n.Pos(),
				End:     n.End(),
				Message: "a goroutine with no join and no stop: wait for it with a sync.WaitGroup or an errgroup.Group, or start it from a type with a Stop method",
				URL:     url,
			})
		}
	}
}

func groupGo(info *types.Info, call *ast.CallExpr) (ast.Expr, bool) {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok || !isMethod(info, call, errgroupPath, "Group", "Go") {
		return nil, false
	}
	return sel.X, true
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

// inLoop reports whether the body of a for or range statement of the same
// function declaration encloses the cursor, through any function literal.
func inLoop(cur inspector.Cursor) bool {
	for ; cur.Node() != nil; cur = cur.Parent() {
		switch cur.Node().(type) {
		case *ast.FuncDecl, *ast.File:
			return false
		}
		switch cur.ParentEdgeKind() {
		case edge.ForStmt_Body, edge.RangeStmt_Body:
			return true
		}
	}
	return false
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
			found = true
		}
		return true
	})
	return found
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
