// Package swagsync reports a route without Swagger annotations and a 4xx
// status that the annotations of the handler omit.
package swagsync

import (
	"go/ast"
	"go/constant"
	"go/types"
	"slices"
	"strconv"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
	"golang.org/x/tools/go/types/typeutil"
)

const (
	name = "swagsync"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/swagsync.md"
	doc  = `make the Swagger annotations of a handler agree with its code

Each registered route must have a handler whose doc comment holds an
@Router line, and each 4xx status that the handler writes must appear in an
@Success or @Failure line. Otherwise the generated API document omits a
route or an answer, and each client that reads it is wrong.`
)

// routeDoc marks a function whose doc comment holds an @Router line.
type routeDoc struct {
	Router string
}

func (*routeDoc) AFact()         {}
func (*routeDoc) String() string { return "routeDoc" }

type Settings struct {
	RegisterMethods []string `json:"register-methods"`
}

func New(s Settings) *analysis.Analyzer {
	register := append([]string(nil), s.RegisterMethods...)
	return &analysis.Analyzer{
		Name:      name,
		Doc:       doc,
		URL:       url,
		Requires:  []*analysis.Analyzer{inspect.Analyzer},
		FactTypes: []analysis.Fact{new(routeDoc)},
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, register)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, register []string) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	local := map[*types.Func]bool{}
	for cur := range insp.Root().Preorder((*ast.FuncDecl)(nil)) {
		decl := cur.Node().(*ast.FuncDecl)
		router, listed := annotations(decl.Doc)
		if router == "" {
			continue
		}
		fn, ok := pass.TypesInfo.Defs[decl.Name].(*types.Func)
		if !ok {
			continue
		}
		local[fn] = true
		pass.ExportObjectFact(fn, &routeDoc{Router: router})
		if decl.Body != nil {
			reportUnlisted(pass, decl, listed)
		}
	}
	for cur := range insp.Root().Preorder((*ast.CallExpr)(nil)) {
		call := cur.Node().(*ast.CallExpr)
		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok || len(call.Args) < 2 || !slices.Contains(register, sel.Sel.Name) {
			continue
		}
		if s := pass.TypesInfo.Selections[sel]; s == nil || s.Kind() != types.MethodVal {
			continue
		}
		fn := handler(pass.TypesInfo, call.Args[1])
		if fn == nil || local[fn] || (fn.Pkg() != pass.Pkg && pass.ImportObjectFact(fn, new(routeDoc))) {
			continue
		}
		label := fn.Name()
		if fn.Pkg() != nil && fn.Pkg() != pass.Pkg {
			label = fn.Pkg().Name() + "." + label
		}
		pass.Report(analysis.Diagnostic{
			Pos:     call.Pos(),
			End:     call.End(),
			Message: "the route has no Swagger annotations: add a doc comment with @Router to " + label,
			URL:     url,
		})
	}
}

func handler(info *types.Info, arg ast.Expr) *types.Func {
	switch x := ast.Unparen(arg).(type) {
	case *ast.CallExpr:
		return typeutil.StaticCallee(info, x)
	case *ast.Ident:
		fn, _ := info.Uses[x].(*types.Func)
		return fn
	case *ast.SelectorExpr:
		fn, _ := info.Uses[x.Sel].(*types.Func)
		return fn
	}
	return nil
}

func annotations(doc *ast.CommentGroup) (string, map[int]bool) {
	router := ""
	listed := map[int]bool{}
	if doc == nil {
		return router, listed
	}
	for _, c := range doc.List {
		fields := strings.Fields(strings.TrimPrefix(c.Text, "//"))
		for i, f := range fields {
			switch f {
			case "@Router":
				router = strings.Join(fields[i:], " ")
			case "@Success", "@Failure":
				if i+1 >= len(fields) {
					continue
				}
				for s := range strings.SplitSeq(fields[i+1], ",") {
					if code, err := strconv.Atoi(s); err == nil {
						listed[code] = true
					}
				}
			}
		}
	}
	return router, listed
}

func reportUnlisted(pass *analysis.Pass, decl *ast.FuncDecl, listed map[int]bool) {
	ast.Inspect(decl.Body, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		for _, arg := range call.Args {
			code := statusConst(pass.TypesInfo, arg)
			if code < 400 || code > 499 || listed[code] {
				continue
			}
			pass.Report(analysis.Diagnostic{
				Pos:     arg.Pos(),
				End:     arg.End(),
				Message: decl.Name.Name + " writes " + strconv.Itoa(code) + ", but no @Success or @Failure line lists it: add the status to the annotations",
				URL:     url,
			})
		}
		return true
	})
}

func statusConst(info *types.Info, arg ast.Expr) int {
	var id *ast.Ident
	switch a := ast.Unparen(arg).(type) {
	case *ast.SelectorExpr:
		id = a.Sel
	case *ast.Ident:
		id = a
	default:
		return 0
	}
	c, ok := info.Uses[id].(*types.Const)
	if !ok || c.Pkg() == nil || c.Pkg().Path() != "net/http" || c.Val().Kind() != constant.Int {
		return 0
	}
	v, ok := constant.Int64Val(c.Val())
	if !ok {
		return 0
	}
	return int(v)
}
