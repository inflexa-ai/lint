// Package keyowner reports a cache, lock, channel or queue key outside the
// package that owns it.
package keyowner

import (
	"go/ast"
	"go/constant"
	"go/types"
	"strconv"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/edge"
	"golang.org/x/tools/go/ast/inspector"
)

const (
	name = "keyowner"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/keyowner.md"
	doc  = `take a key from the package that owns it

A cache, lock, channel or queue key is a contract of the package that owns
it. A copy of its text in another package breaks without a compile error
when the owner changes the key, and it hides who reads and writes the key.
Take the key from the key builder of the owner.`
)

type Key struct {
	Prefix string `json:"prefix"`
	Owner  string `json:"owner"`
}

type Settings struct {
	Keys []Key `json:"keys"`
}

func New(s Settings) *analysis.Analyzer {
	keys := append([]Key(nil), s.Keys...)
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, keys)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, keys []Key) {
	pkg := strings.TrimSuffix(pass.Pkg.Path(), "_test")
	var foreign []Key
	for _, k := range keys {
		if pkg != k.Owner && !strings.HasPrefix(pkg, k.Owner+"/") {
			foreign = append(foreign, k)
		}
	}
	if len(foreign) == 0 {
		return
	}
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	nodes := []ast.Node{(*ast.BasicLit)(nil), (*ast.Ident)(nil), (*ast.SelectorExpr)(nil), (*ast.BinaryExpr)(nil), (*ast.ParenExpr)(nil)}
	for cur := range insp.Root().Preorder(nodes...) {
		switch cur.ParentEdgeKind() {
		case edge.ImportSpec_Path, edge.Field_Tag, edge.SelectorExpr_Sel:
			continue
		case edge.BinaryExpr_X, edge.BinaryExpr_Y, edge.ParenExpr_X:
			if _, ok := stringValue(pass, cur.Parent().Node()); ok {
				continue
			}
		}
		value, ok := stringValue(pass, cur.Node())
		if !ok {
			continue
		}
		declared := constPackage(pass, cur.Node())
		for _, k := range foreign {
			if !strings.HasPrefix(value, k.Prefix) || declared == k.Owner || strings.HasPrefix(declared, k.Owner+"/") {
				continue
			}
			pass.Report(analysis.Diagnostic{
				Pos:     cur.Node().Pos(),
				End:     cur.Node().End(),
				Message: "the key " + strconv.Quote(value) + " belongs to " + k.Owner + ": take it from the key builder of that package",
				URL:     url,
			})
			break
		}
	}
}

// constPackage returns the import path of the package that declares the
// constant that an identifier or a selector names, or "".
func constPackage(pass *analysis.Pass, n ast.Node) string {
	x, ok := n.(ast.Expr)
	if !ok {
		return ""
	}
	var id *ast.Ident
	switch x := ast.Unparen(x).(type) {
	case *ast.Ident:
		id = x
	case *ast.SelectorExpr:
		id = x.Sel
	default:
		return ""
	}
	c, ok := pass.TypesInfo.Uses[id].(*types.Const)
	if !ok || c.Pkg() == nil {
		return ""
	}
	return c.Pkg().Path()
}

func stringValue(pass *analysis.Pass, n ast.Node) (string, bool) {
	x, ok := n.(ast.Expr)
	if !ok {
		return "", false
	}
	tv, ok := pass.TypesInfo.Types[x]
	if !ok || tv.Value == nil || tv.Value.Kind() != constant.String {
		return "", false
	}
	return constant.StringVal(tv.Value), true
}
