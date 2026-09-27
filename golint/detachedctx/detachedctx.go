// Package detachedctx reports a cleanup call that takes a request context.
package detachedctx

import (
	"go/ast"
	"go/token"
	"go/types"
	"slices"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
	"golang.org/x/tools/go/types/typeutil"
)

const (
	name = "detachedctx"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/detachedctx.md"
	doc  = `give a cleanup a context that the request cannot cancel

A call inside a defer, or inside a function literal passed to a hook method
such as a commit or rollback hook, runs when the request can be over. A
request context is then canceled, and the cleanup fails. Pass a context
that comes from context.WithoutCancel or context.Background.`
)

// Settings configures the analyzer. A nil list gives the default; an empty
// list gives an empty set.
type Settings struct {
	HookMethods    []string `json:"hook-methods"`
	ExemptPackages []string `json:"exempt-packages"`
}

func New(s Settings) *analysis.Analyzer {
	c := config{
		hooks:  s.HookMethods,
		exempt: s.ExemptPackages,
	}
	if c.exempt == nil {
		c.exempt = []string{"log/slog"}
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

type config struct {
	hooks, exempt []string
}

func (c config) run(pass *analysis.Pass) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	values := assignments(pass)
	reported := map[*ast.CallExpr]bool{}
	checkCall := func(call *ast.CallExpr, scope ast.Node) {
		if reported[call] || c.exemptCall(pass.TypesInfo, call) {
			return
		}
		for _, arg := range call.Args {
			id, ok := ast.Unparen(arg).(*ast.Ident)
			if !ok || !isContext(pass.TypesInfo.TypeOf(id)) {
				continue
			}
			obj := pass.TypesInfo.ObjectOf(id)
			if obj == nil || (obj.Pos() >= scope.Pos() && obj.Pos() < scope.End()) || detached(pass.TypesInfo, values, obj, map[types.Object]bool{}) {
				continue
			}
			reported[call] = true
			pass.Report(analysis.Diagnostic{
				Pos:     call.Pos(),
				End:     call.End(),
				Message: "the cleanup call takes the context " + id.Name + ", which the request can cancel before the cleanup runs: pass context.WithoutCancel(" + id.Name + ")",
				URL:     url,
			})
			return
		}
	}
	checkBody := func(lit inspector.Cursor) {
		for cur := range lit.Preorder((*ast.CallExpr)(nil)) {
			checkCall(cur.Node().(*ast.CallExpr), lit.Node())
		}
	}
	for cur := range insp.Root().Preorder((*ast.DeferStmt)(nil), (*ast.CallExpr)(nil)) {
		switch n := cur.Node().(type) {
		case *ast.DeferStmt:
			// The arguments of the deferred call run at the defer statement, not
			// at the cleanup, thus only the call itself and the body of a
			// deferred function literal count.
			checkCall(n.Call, n)
			if lit, ok := ast.Unparen(n.Call.Fun).(*ast.FuncLit); ok {
				fun, _ := cur.FindNode(lit)
				checkBody(fun)
			}
		case *ast.CallExpr:
			sel, ok := n.Fun.(*ast.SelectorExpr)
			if !ok || !slices.Contains(c.hooks, sel.Sel.Name) {
				continue
			}
			if s := pass.TypesInfo.Selections[sel]; s == nil || s.Kind() != types.MethodVal {
				continue
			}
			for _, arg := range n.Args {
				if fn, ok := ast.Unparen(arg).(*ast.FuncLit); ok {
					lit, _ := cur.FindNode(fn)
					checkBody(lit)
				}
			}
		}
	}
}

func (c config) exemptCall(info *types.Info, call *ast.CallExpr) bool {
	obj := typeutil.Callee(info, call)
	if obj == nil || obj.Pkg() == nil {
		return false
	}
	path := obj.Pkg().Path()
	if path == "context" && obj.Name() == "WithoutCancel" {
		return true
	}
	return slices.ContainsFunc(c.exempt, func(p string) bool { return path == p || strings.HasPrefix(path, p+"/") })
}

// assignments maps each variable of the package to the expressions assigned
// to it. For a multi-value assignment the value is the call.
func assignments(pass *analysis.Pass) map[types.Object][]ast.Expr {
	values := map[types.Object][]ast.Expr{}
	add := func(lhs []ast.Expr, rhs []ast.Expr) {
		for i, x := range lhs {
			id, ok := x.(*ast.Ident)
			if !ok {
				continue
			}
			obj := pass.TypesInfo.ObjectOf(id)
			if obj == nil {
				continue
			}
			switch {
			case len(lhs) == len(rhs):
				values[obj] = append(values[obj], rhs[i])
			case len(rhs) == 1:
				values[obj] = append(values[obj], rhs[0])
			}
		}
	}
	for _, file := range pass.Files {
		ast.Inspect(file, func(n ast.Node) bool {
			switch n := n.(type) {
			case *ast.AssignStmt:
				if n.Tok != token.ASSIGN && n.Tok != token.DEFINE {
					return true
				}
				add(n.Lhs, n.Rhs)
			case *ast.ValueSpec:
				lhs := make([]ast.Expr, len(n.Names))
				for i, id := range n.Names {
					lhs[i] = id
				}
				add(lhs, n.Values)
			}
			return true
		})
	}
	return values
}

// detached reports whether each value assigned to the variable comes from
// context.WithoutCancel or context.Background, directly or through further
// context.With* calls.
func detached(info *types.Info, values map[types.Object][]ast.Expr, obj types.Object, seen map[types.Object]bool) bool {
	if seen[obj] || len(values[obj]) == 0 {
		return false
	}
	seen[obj] = true
	defer delete(seen, obj)
	for _, v := range values[obj] {
		if !detachedExpr(info, values, v, seen) {
			return false
		}
	}
	return true
}

func detachedExpr(info *types.Info, values map[types.Object][]ast.Expr, x ast.Expr, seen map[types.Object]bool) bool {
	switch x := ast.Unparen(x).(type) {
	case *ast.Ident:
		obj := info.ObjectOf(x)
		return obj != nil && detached(info, values, obj, seen)
	case *ast.CallExpr:
		fn := typeutil.StaticCallee(info, x)
		if fn == nil || fn.Pkg() == nil || fn.Pkg().Path() != "context" {
			return false
		}
		switch {
		case fn.Name() == "WithoutCancel" || fn.Name() == "Background":
			return true
		case strings.HasPrefix(fn.Name(), "With") && len(x.Args) > 0:
			return detachedExpr(info, values, x.Args[0], seen)
		}
	}
	return false
}

func isContext(t types.Type) bool {
	named, ok := types.Unalias(t).(*types.Named)
	if !ok {
		return false
	}
	obj := named.Obj()
	return obj.Pkg() != nil && obj.Pkg().Path() == "context" && obj.Name() == "Context"
}
