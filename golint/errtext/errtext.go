// Package errtext reports a condition on the text of an error.
package errtext

import (
	"go/ast"
	"go/token"
	"go/types"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/edge"
	"golang.org/x/tools/go/ast/inspector"
	"golang.org/x/tools/go/types/typeutil"
)

const (
	name = "errtext"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/errtext.md"
	doc  = `classify an error by its identity, not by its text

A call of Error() on a value of type error inside a comparison, a strings
test or a switch makes a branch depend on the wording of a message. A new
wording in the callee then breaks the branch without a compile error.
Compare with errors.Is or errors.As against a sentinel or a type that the
callee exports.`
)

type Settings struct{}

func New(Settings) *analysis.Analyzer {
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run:      run,
	}
}

var Analyzer = New(Settings{})

var stringTests = map[string]bool{"Contains": true, "HasPrefix": true, "HasSuffix": true, "EqualFold": true}

func run(pass *analysis.Pass) (any, error) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	for cur := range insp.Root().Preorder((*ast.CallExpr)(nil)) {
		call := cur.Node().(*ast.CallExpr)
		if !isErrorText(pass.TypesInfo, call) || !inCondition(pass.TypesInfo, cur) {
			continue
		}
		pass.Report(analysis.Diagnostic{
			Pos:     call.Pos(),
			End:     call.End(),
			Message: "the condition reads the text of an error: compare with errors.Is or errors.As against a sentinel or a type that the callee exports",
			URL:     url,
		})
	}
	return nil, nil
}

func isErrorText(info *types.Info, call *ast.CallExpr) bool {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok || sel.Sel.Name != "Error" || len(call.Args) != 0 {
		return false
	}
	return isErrorInterface(info.TypeOf(sel.X))
}

func inCondition(info *types.Info, cur inspector.Cursor) bool {
	for cur.ParentEdgeKind() == edge.ParenExpr_X {
		cur = cur.Parent()
	}
	switch cur.ParentEdgeKind() {
	case edge.BinaryExpr_X, edge.BinaryExpr_Y:
		op := cur.Parent().Node().(*ast.BinaryExpr).Op
		return op == token.EQL || op == token.NEQ
	case edge.CallExpr_Args:
		fn := typeutil.StaticCallee(info, cur.Parent().Node().(*ast.CallExpr))
		return fn != nil && fn.Pkg() != nil && fn.Pkg().Path() == "strings" && stringTests[fn.Name()]
	case edge.SwitchStmt_Tag, edge.CaseClause_List:
		return true
	}
	return false
}

func isErrorInterface(t types.Type) bool {
	if t == nil || !types.IsInterface(t) {
		return false
	}
	errType := types.Universe.Lookup("error").Type()
	return types.Implements(t, errType.Underlying().(*types.Interface))
}
