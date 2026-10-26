// Package typedids reports a uuid.UUID field, parameter or result whose name
// has a typed ID counterpart.
package typedids

import (
	"go/ast"
	"go/types"
	"path"
	"strings"
	"unicode"
	"unicode/utf8"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
)

const (
	name = "typedids"
	url  = "https://github.com/inflexa-ai/lint/blob/main/docs/rules/typedids.md"
	doc  = `use the typed ID in place of uuid.UUID

A struct field, a function parameter or a function result whose name ends
with a typed ID name, for example RevokedByUserID, must use that typed ID
and not uuid.UUID. Two IDs of different entities then have different types,
and the compiler rejects a mix-up.`
)

// Settings configures the analyzer. inflexa-lint-config fills Names from
// IDsPackage when it writes the configuration, so that the names salt the lint
// cache.
type Settings struct {
	IDsPackage string   `json:"ids-package"`
	Names      []string `json:"names"`
}

func New(s Settings) *analysis.Analyzer {
	qualifier := ""
	if s.IDsPackage != "" {
		qualifier = path.Base(s.IDsPackage) + "."
	}
	names := append([]string(nil), s.Names...)
	return &analysis.Analyzer{
		Name:     name,
		Doc:      doc,
		URL:      url,
		Requires: []*analysis.Analyzer{inspect.Analyzer},
		Run: func(pass *analysis.Pass) (any, error) {
			run(pass, names, qualifier)
			return nil, nil
		},
	}
}

var Analyzer = New(Settings{})

func run(pass *analysis.Pass, names []string, qualifier string) {
	if len(names) == 0 {
		return
	}
	// inspect.Analyzer is in Requires, and its result is always an *inspector.Inspector.
	insp := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)
	check := func(fields *ast.FieldList) {
		if fields == nil {
			return
		}
		for _, field := range fields.List {
			found, container := uuidIn(pass.TypesInfo.TypeOf(field.Type))
			if !found {
				continue
			}
			subject := " is a uuid.UUID, but "
			if container {
				subject = " holds uuid.UUID values, but "
			}
			for _, id := range field.Names {
				typed := match(id.Name, names, container)
				if typed == "" {
					continue
				}
				pass.Report(analysis.Diagnostic{
					Pos: id.Pos(),
					End: field.Type.End(),
					Message: id.Name + subject + qualifier + typed +
						" exists: use the typed ID, so that the compiler rejects an ID of another entity",
					URL: url,
				})
			}
		}
	}
	for cur := range insp.Root().Preorder((*ast.StructType)(nil), (*ast.FuncType)(nil)) {
		switch n := cur.Node().(type) {
		case *ast.StructType:
			check(n.Fields)
		case *ast.FuncType:
			check(n.Params)
			check(n.Results)
		}
	}
}

// match returns the longest typed ID name that the identifier ends with, in its
// exported form (RevokedByUserID) or its unexported form (userID). For a
// container the plural form (UserIDs, userIDs) also matches.
func match(ident string, names []string, container bool) string {
	best := ""
	for _, n := range names {
		if len(n) <= len(best) {
			continue
		}
		forms := []string{n}
		if container {
			forms = append(forms, n+"s")
		}
		for _, f := range forms {
			if strings.HasSuffix(ident, f) || ident == lowerFirst(f) {
				best = n
			}
		}
	}
	return best
}

func lowerFirst(s string) string {
	r, size := utf8.DecodeRuneInString(s)
	return string(unicode.ToLower(r)) + s[size:]
}

// uuidPackages holds `uuid`, the standard library package since Go 1.27, and
// the third-party package that came before it.
var uuidPackages = map[string]bool{"uuid": true, "github.com/google/uuid": true}

// uuidIn reports whether t is a uuid.UUID, through pointers, slices, arrays
// and map values, and whether a slice, an array or a map holds it.
func uuidIn(t types.Type) (found, container bool) {
	for {
		switch u := types.Unalias(t).(type) {
		case *types.Pointer:
			t = u.Elem()
		case *types.Slice:
			t, container = u.Elem(), true
		case *types.Array:
			t, container = u.Elem(), true
		case *types.Map:
			t, container = u.Elem(), true
		case *types.Named:
			obj := u.Obj()
			return obj.Pkg() != nil && uuidPackages[obj.Pkg().Path()] && obj.Name() == "UUID", container
		default:
			return false, false
		}
	}
}
