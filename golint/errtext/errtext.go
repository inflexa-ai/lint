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
test, a regexp match or a switch makes a branch depend on the wording of a
message, also through a local variable that holds the text. A new
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

var textTests = map[string]bool{
	"strings.Contains": true, "strings.ContainsAny": true, "strings.HasPrefix": true, "strings.HasSuffix": true,
	"strings.EqualFold": true, "strings.Index": true, "strings.LastIndex": true, "regexp.MatchString": true,
}

func run(pass *analysis.Pass) (any, error) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	report := func(n ast.Node) {
		pass.Report(analysis.Diagnostic{
			Pos:     n.Pos(),
			End:     n.End(),
			Message: "the condition reads the text of an error: compare with errors.Is or errors.As against a sentinel or a type that the callee exports",
			URL:     url,
		})
	}
	texts := map[types.Object]bool{}
	for cur := range insp.Root().Preorder((*ast.CallExpr)(nil)) {
		call := cur.Node().(*ast.CallExpr)
		if !isErrorText(pass.TypesInfo, call) {
			continue
		}
		if obj := assignedLocal(pass, cur); obj != nil {
			texts[obj] = true
		} else if inCondition(pass.TypesInfo, cur) {
			report(call)
		}
	}
	if len(texts) == 0 {
		return nil, nil
	}
	for cur := range insp.Root().Preorder((*ast.Ident)(nil)) {
		if id := cur.Node().(*ast.Ident); texts[pass.TypesInfo.Uses[id]] && inCondition(pass.TypesInfo, cur) {
			report(id)
		}
	}
	return nil, nil
}

// assignedLocal returns the local variable that the call is the value of, in
// an assignment or a var declaration with one value for each name.
func assignedLocal(pass *analysis.Pass, cur inspector.Cursor) types.Object {
	var id *ast.Ident
	kind, i := cur.ParentEdge()
	// The edge kind fixes the node type of the parent.
	switch kind {
	case edge.AssignStmt_Rhs:
		assign := cur.Parent().Node().(*ast.AssignStmt)
		if len(assign.Lhs) == len(assign.Rhs) {
			id, _ = assign.Lhs[i].(*ast.Ident)
		}
	case edge.ValueSpec_Values:
		spec := cur.Parent().Node().(*ast.ValueSpec)
		if len(spec.Names) == len(spec.Values) {
			id = spec.Names[i]
		}
	}
	if id == nil {
		return nil
	}
	obj, ok := pass.TypesInfo.ObjectOf(id).(*types.Var)
	if !ok || obj.Parent() == pass.Pkg.Scope() {
		return nil
	}
	return obj
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
		return fn != nil && fn.Pkg() != nil && textTests[fn.Pkg().Path()+"."+fn.Name()]
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
