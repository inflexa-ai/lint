// Package anyapi reports any and map[string]any in an exported API.
package anyapi

import (
	"go/ast"
	"go/types"
	"slices"
	"strings"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
)

const (
	name = "anyapi"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/anyapi.md"
	doc  = `give an exported API a type that states its shape

An exported parameter, result or field of type any or map[string]any tells
the caller nothing, and each caller must guess and check the content. Use a
struct, or a named type that states the shape.`
)

// Settings configures the analyzer. A nil ExemptMethods gives the default; an
// empty list gives an empty set.
type Settings struct {
	ExemptMethods []string `json:"exempt-methods"`
}

func New(s Settings) *analysis.Analyzer {
	exempt := s.ExemptMethods
	if exempt == nil {
		exempt = []string{"Scan"}
	}
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, exempt)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, exempt []string) {
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	report := func(node ast.Node, subject string, t types.Type) {
		shape := "map[string]any"
		if isAny(t) {
			shape = "any"
		}
		pass.Report(analysis.Diagnostic{
			Pos:     node.Pos(),
			End:     node.End(),
			Message: subject + " exposes " + shape + " in an exported API: use a struct or a named type that states the shape",
			URL:     url,
		})
	}
	checkSignature := func(name string, ft *ast.FuncType) {
		for _, fields := range []*ast.FieldList{ft.Params, ft.Results} {
			if fields == nil {
				continue
			}
			for _, field := range fields.List {
				typeExpr := field.Type
				if ellipsis, ok := typeExpr.(*ast.Ellipsis); ok {
					typeExpr = ellipsis.Elt
				}
				t := pass.TypesInfo.TypeOf(typeExpr)
				if !isAnyShape(t) || (typeExpr != field.Type && isAny(t)) {
					continue
				}
				if len(field.Names) == 0 {
					report(field.Type, name, t)
				}
				for _, id := range field.Names {
					report(id, id.Name, t)
				}
			}
		}
	}
	checkTypes := func(at ast.Node, m *types.Func) {
		sig := m.Signature()
		check := func(tuple *types.Tuple, variadic bool) {
			for i := range tuple.Len() {
				v := tuple.At(i)
				t := v.Type()
				if variadic && i == tuple.Len()-1 {
					if sl, ok := t.(*types.Slice); ok {
						t = sl.Elem()
						if isAny(t) {
							continue
						}
					}
				}
				if !isAnyShape(t) {
					continue
				}
				label := v.Name()
				if label == "" {
					label = m.Name()
				}
				report(at, label, t)
			}
		}
		check(sig.Params(), sig.Variadic())
		check(sig.Results(), false)
	}
	var exported []*ast.InterfaceType
	for cur := range insp.Root().Preorder((*ast.FuncDecl)(nil), (*ast.TypeSpec)(nil)) {
		switch n := cur.Node().(type) {
		case *ast.FuncDecl:
			if !n.Name.IsExported() {
				continue
			}
			if n.Recv != nil && (!exportedReceiver(n.Recv) || slices.Contains(exempt, n.Name.Name)) {
				continue
			}
			checkSignature(n.Name.Name, n.Type)
		case *ast.TypeSpec:
			if !n.Name.IsExported() {
				continue
			}
			switch t := n.Type.(type) {
			case *ast.StructType:
				for _, field := range t.Fields.List {
					ft := pass.TypesInfo.TypeOf(field.Type)
					if !isAnyShape(ft) {
						continue
					}
					for _, id := range field.Names {
						if id.IsExported() {
							report(id, id.Name, ft)
						}
					}
				}
			case *ast.InterfaceType:
				exported = append(exported, t)
			}
		}
	}
	// The method set of an exported interface holds the methods of each
	// embedded interface too. A method declared in this package is reported at
	// its declaration, one time; a method of another package of the same
	// module at the embedding entry that gives it.
	local := map[*types.Func]*ast.FuncType{}
	for cur := range insp.Root().Preorder((*ast.InterfaceType)(nil)) {
		for _, method := range cur.Node().(*ast.InterfaceType).Methods.List {
			ft, ok := method.Type.(*ast.FuncType)
			if !ok {
				continue
			}
			for _, id := range method.Names {
				if fn, ok := pass.TypesInfo.Defs[id].(*types.Func); ok {
					local[fn] = ft
				}
			}
		}
	}
	done := map[*types.Func]bool{}
	for _, it := range exported {
		iface, ok := pass.TypesInfo.TypeOf(it).(*types.Interface)
		if !ok {
			continue
		}
		for m := range iface.Methods() {
			if !m.Exported() || slices.Contains(exempt, m.Name()) || done[m] {
				continue
			}
			done[m] = true
			if ft, ok := local[m]; ok {
				checkSignature(m.Name(), ft)
				continue
			}
			if m.Pkg() == nil || !sameModule(pass, m.Pkg().Path()) {
				continue
			}
			if entry := embeddingEntry(pass.TypesInfo, it, m); entry != nil {
				checkTypes(entry, m)
			}
		}
	}
}

// sameModule reports whether the package belongs to the module of the pass,
// because the repository cannot change a method of another module. Without
// module information, as in the GOPATH mode of analysistest, a first path
// element with no dot stands for the module. Without module information and
// with a dotted first element, no other package counts as the same module.
func sameModule(pass *analysis.Pass, path string) bool {
	module := ""
	if pass.Module != nil {
		module = pass.Module.Path
	}
	if module == "" {
		first, _, _ := strings.Cut(pass.Pkg.Path(), "/")
		if strings.Contains(first, ".") {
			return false
		}
		module = first
	}
	return path == module || strings.HasPrefix(path, module+"/")
}

// embeddingEntry returns the embedded type of the interface literal whose
// method set holds the method.
func embeddingEntry(info *types.Info, it *ast.InterfaceType, m *types.Func) ast.Node {
	for _, field := range it.Methods.List {
		if len(field.Names) > 0 {
			continue
		}
		embedded, ok := info.TypeOf(field.Type).Underlying().(*types.Interface)
		if !ok {
			continue
		}
		for em := range embedded.Methods() {
			if em == m {
				return field.Type
			}
		}
	}
	return nil
}

func exportedReceiver(recv *ast.FieldList) bool {
	if len(recv.List) == 0 {
		return false
	}
	x := recv.List[0].Type
	for {
		switch t := x.(type) {
		case *ast.StarExpr:
			x = t.X
		case *ast.IndexExpr:
			x = t.X
		case *ast.IndexListExpr:
			x = t.X
		case *ast.ParenExpr:
			x = t.X
		case *ast.Ident:
			return t.IsExported()
		default:
			return false
		}
	}
}

func isAnyShape(t types.Type) bool {
	if isAny(t) {
		return true
	}
	m, ok := types.Unalias(t).(*types.Map)
	if !ok {
		return false
	}
	key, ok := types.Unalias(m.Key()).(*types.Basic)
	return ok && key.Kind() == types.String && isAny(m.Elem())
}

func isAny(t types.Type) bool {
	iface, ok := types.Unalias(t).(*types.Interface)
	return ok && iface.Empty()
}
