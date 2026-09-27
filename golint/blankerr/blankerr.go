// Package blankerr reports a discarded error without a SAFETY comment.
package blankerr

import (
	"go/ast"
	"go/token"
	"go/types"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
)

const (
	name = "blankerr"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/blankerr.md"
	doc  = `state the reason for a discarded error in a SAFETY comment

An assignment of an error to the blank identifier hides a failure. When the
discard is safe, a comment with SAFETY: on the line directly above the
statement states why. Otherwise handle the error.`
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

func run(pass *analysis.Pass) (any, error) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	for fileCur := range insp.Root().Children() {
		safe := safetyLines(pass.Fset, fileCur.Node().(*ast.File))
		for cur := range fileCur.Preorder((*ast.AssignStmt)(nil)) {
			stmt := cur.Node().(*ast.AssignStmt)
			if !discardsError(pass.TypesInfo, stmt) || safe[pass.Fset.Position(stmt.Pos()).Line-1] {
				continue
			}
			pass.Report(analysis.Diagnostic{
				Pos:     stmt.Pos(),
				End:     stmt.End(),
				Message: "the error is discarded without a reason: handle it, or state why the discard is safe in a SAFETY: comment on the line above",
				URL:     url,
			})
		}
	}
	return nil, nil
}

// safetyLines returns the last line of each comment group that holds SAFETY:.
func safetyLines(fset *token.FileSet, file *ast.File) map[int]bool {
	lines := map[int]bool{}
	for _, cg := range file.Comments {
		for _, c := range cg.List {
			if strings.Contains(c.Text, "SAFETY:") {
				lines[fset.Position(cg.End()).Line] = true
				break
			}
		}
	}
	return lines
}

func discardsError(info *types.Info, stmt *ast.AssignStmt) bool {
	for i, lhs := range stmt.Lhs {
		if id, ok := lhs.(*ast.Ident); !ok || id.Name != "_" {
			continue
		}
		var t types.Type
		switch {
		case len(stmt.Lhs) == len(stmt.Rhs):
			t = info.TypeOf(stmt.Rhs[i])
		case len(stmt.Rhs) == 1:
			if tuple, ok := info.TypeOf(stmt.Rhs[0]).(*types.Tuple); ok && i < tuple.Len() {
				t = tuple.At(i).Type()
			}
		}
		if isErrorInterface(t) {
			return true
		}
	}
	return false
}

func isErrorInterface(t types.Type) bool {
	if t == nil || !types.IsInterface(t) {
		return false
	}
	return types.Implements(t, types.Universe.Lookup("error").Type().Underlying().(*types.Interface))
}
