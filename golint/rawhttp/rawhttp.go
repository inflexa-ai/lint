// Package rawhttp reports a raw HTTP client and a raw read of a request body
// outside the approved packages.
package rawhttp

import (
	"go/ast"
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
	name = "rawhttp"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/rawhttp.md"
	doc  = `use the approved packages for HTTP clients and request bodies

A new http.Client in each package gives each caller its own timeouts,
tracing and error handling, or none. A raw read of a request body skips the
size limit and the decode errors of the shared helper. Build a client only
in an approved client package, and read a body only in an approved body
package.`
)

type Settings struct {
	ClientPackages []string `json:"client-packages"`
	BodyPackages   []string `json:"body-packages"`
}

func New(s Settings) *analysis.Analyzer {
	clients := append([]string(nil), s.ClientPackages...)
	bodies := append([]string(nil), s.BodyPackages...)
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, clients, bodies)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, clients, bodies []string) {
	path := pass.Pkg.Path()
	under := func(p string) bool { return strings.HasPrefix(path, p) }
	checkClients := !slices.ContainsFunc(clients, under)
	checkBodies := !slices.ContainsFunc(bodies, under)
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	reportClient := func(n ast.Node) {
		pass.Report(analysis.Diagnostic{
			Pos:     n.Pos(),
			End:     n.End(),
			Message: "build the HTTP client in an approved client package, so that each call gets its timeout, tracing and error handling",
			URL:     url,
		})
	}
	for cur := range insp.Root().Preorder((*ast.CompositeLit)(nil), (*ast.CallExpr)(nil), (*ast.ValueSpec)(nil), (*ast.SelectorExpr)(nil)) {
		switch n := cur.Node().(type) {
		case *ast.CompositeLit:
			if checkClients && isClient(pass.TypesInfo.TypeOf(n)) {
				reportClient(n)
			}
		case *ast.CallExpr:
			if checkClients && isBuiltin(pass.TypesInfo, n.Fun, "new") && len(n.Args) == 1 && isClient(pass.TypesInfo.TypeOf(n.Args[0])) {
				reportClient(n)
			}
		case *ast.ValueSpec:
			if checkClients && n.Type != nil && len(n.Values) == 0 && isClient(pass.TypesInfo.TypeOf(n.Type)) {
				reportClient(n)
			}
		case *ast.SelectorExpr:
			if checkBodies && isRequestBody(pass.TypesInfo, n) && readsBody(pass.TypesInfo, cur) {
				pass.Report(analysis.Diagnostic{
					Pos:     n.Pos(),
					End:     n.End(),
					Message: "read the request body through the approved body package, so that each read gets the size limit and the decode errors",
					URL:     url,
				})
			}
		}
	}
}

func isClient(t types.Type) bool {
	named, ok := types.Unalias(t).(*types.Named)
	return ok && named.Obj().Pkg() != nil && named.Obj().Pkg().Path() == "net/http" && named.Obj().Name() == "Client"
}

func isBuiltin(info *types.Info, fun ast.Expr, name string) bool {
	id, ok := ast.Unparen(fun).(*ast.Ident)
	if !ok {
		return false
	}
	b, ok := info.Uses[id].(*types.Builtin)
	return ok && b.Name() == name
}

func isRequestBody(info *types.Info, sel *ast.SelectorExpr) bool {
	s, ok := info.Selections[sel]
	return ok && s.Kind() == types.FieldVal && sel.Sel.Name == "Body" && isNamed(info.TypeOf(sel.X), "net/http", "Request")
}

// readsBody reports whether the use of the body can read it. A write of the
// field, a Close, a nil test and the argument of http.MaxBytesReader do not
// read it.
func readsBody(info *types.Info, cur inspector.Cursor) bool {
	for cur.ParentEdgeKind() == edge.ParenExpr_X {
		cur = cur.Parent()
	}
	switch parent := cur.Parent().Node().(type) {
	case *ast.AssignStmt:
		return cur.ParentEdgeKind() != edge.AssignStmt_Lhs
	case *ast.SelectorExpr:
		return parent.Sel.Name != "Close"
	case *ast.BinaryExpr:
		other := parent.X
		if cur.ParentEdgeKind() == edge.BinaryExpr_X {
			other = parent.Y
		}
		return !((parent.Op == token.EQL || parent.Op == token.NEQ) && info.Types[other].IsNil())
	case *ast.CallExpr:
		fn := typeutil.StaticCallee(info, parent)
		return fn == nil || fn.Pkg() == nil || fn.Pkg().Path()+"."+fn.Name() != "net/http.MaxBytesReader"
	}
	return true
}

func isNamed(t types.Type, pkg, typ string) bool {
	if p, ok := types.Unalias(t).(*types.Pointer); ok {
		t = p.Elem()
	}
	named, ok := types.Unalias(t).(*types.Named)
	return ok && named.Obj().Pkg() != nil && named.Obj().Pkg().Path() == pkg && named.Obj().Name() == typ
}
