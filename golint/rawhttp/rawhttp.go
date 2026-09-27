// Package rawhttp reports a raw HTTP client and a raw read of a request body
// outside the approved packages.
package rawhttp

import (
	"go/ast"
	"go/types"
	"slices"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
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
	for cur := range insp.Root().Preorder((*ast.CompositeLit)(nil), (*ast.CallExpr)(nil)) {
		switch n := cur.Node().(type) {
		case *ast.CompositeLit:
			if checkClients && isNamed(pass.TypesInfo.TypeOf(n), "net/http", "Client") {
				pass.Report(analysis.Diagnostic{
					Pos:     n.Pos(),
					End:     n.End(),
					Message: "build the HTTP client in an approved client package, so that each call gets its timeout, tracing and error handling",
					URL:     url,
				})
			}
		case *ast.CallExpr:
			if checkBodies && readsRequestBody(pass.TypesInfo, n) {
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

func readsRequestBody(info *types.Info, call *ast.CallExpr) bool {
	fn := typeutil.StaticCallee(info, call)
	if fn == nil || fn.Pkg() == nil || len(call.Args) != 1 {
		return false
	}
	switch fn.Pkg().Path() + "." + fn.Name() {
	case "encoding/json.NewDecoder", "io.ReadAll":
	default:
		return false
	}
	sel, ok := ast.Unparen(call.Args[0]).(*ast.SelectorExpr)
	return ok && sel.Sel.Name == "Body" && isNamed(info.TypeOf(sel.X), "net/http", "Request")
}

func isNamed(t types.Type, pkg, typ string) bool {
	if p, ok := types.Unalias(t).(*types.Pointer); ok {
		t = p.Elem()
	}
	named, ok := types.Unalias(t).(*types.Named)
	return ok && named.Obj().Pkg() != nil && named.Obj().Pkg().Path() == pkg && named.Obj().Name() == typ
}
