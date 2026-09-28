import type { ESTree, Rule } from '@oxlint/plugins'
import { bareReferenceName, collectTypeAliases, unwrapTransparent } from '../helpers/type-annotations.ts'

// The names a dictionary value must not resolve to. Each gives the reader no
// contract: `unknown` and `any` are unparsed, `object` is any non-primitive,
// and `{}` is everything except null. A union that contains one of these
// carries the same hole.
const UNSAFE: Record<string, string> = {
  TSUnknownKeyword: 'unknown',
  TSAnyKeyword: 'any',
  TSObjectKeyword: 'object',
}

/** The declarations that give a name to something in this module, which shadows a global of that name. */
function localNames(program: ESTree.Program): Set<string> {
  const names = new Set<string>()
  for (const statement of program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type === 'ImportDeclaration') {
      for (const specifier of declaration.specifiers) names.add(specifier.local.name)
    } else if (declaration && 'id' in declaration && declaration.id?.type === 'Identifier') {
      names.add(declaration.id.name)
    }
  }
  return names
}

/** The interfaces of this module that declare no member, by name, which stand for the empty object. */
function emptyInterfaceNames(program: ESTree.Program): Set<string> {
  const byName = new Map<string, ESTree.TSInterfaceDeclaration[]>()
  for (const statement of program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (declaration?.type === 'TSInterfaceDeclaration') {
      byName.set(declaration.id.name, [...(byName.get(declaration.id.name) ?? []), declaration])
    }
  }
  const empty = new Set<string>()
  for (const [name, declarations] of byName) {
    const [only] = declarations
    if (declarations.length === 1 && only.extends.length === 0 && only.body.body.length === 0) empty.add(name)
  }
  return empty
}

/**
 * `Record<string, unknown>`, `{ [key: string]: any }` and a mapped type over an
 * `object` value are a container with a typed key and an untyped value. A read
 * off one gives the escape hatch back, so the parsing the value type skipped is
 * pushed to every reader. The value has a shape where it enters the program,
 * and a zod schema (`z.record(z.string(), Value)`) parses it into a dictionary
 * whose value type is that shape.
 *
 * The value is followed through `readonly`, a union, and an alias or empty
 * interface of the same file, so the hole cannot hide one hop away. Two things
 * are deliberately not followed, because reading one file cannot settle them:
 * a name from another file, and a generic container instantiated with the
 * escape hatch (`Bag<unknown>` for `type Bag<T> = Record<string, T>`). A
 * shadowed `Record` of one's own is left alone: it is not the builtin.
 */
export const noUnsafeDictionary: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Give a dictionary a parsed value type, not an escape hatch',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-unsafe-dictionary.md',
    },
    schema: [],
    messages: {
      unsafeDictionary:
        'This dictionary has a typed key and a `{{value}}` value, so a read off it gives back a value nothing parsed. Type the value with the shape it has once it is parsed. `z.record(z.string(), Value)` parses untyped data into a dictionary whose value type is `z.infer` of the value schema.',
    },
  },
  create(context) {
    let aliases = new Map<string, ESTree.TSTypeAliasDeclaration>()
    let locals = new Set<string>()
    let emptyInterfaces = new Set<string>()

    /** The escape hatch a value type resolves to, or `undefined` when it names a real shape. */
    function unsafeValue(type: ESTree.TSType, visited = new Set<string>()): string | undefined {
      const resolved = unwrapTransparent(type)
      if (resolved.type in UNSAFE) return UNSAFE[resolved.type]
      if (resolved.type === 'TSTypeLiteral') return resolved.members.length === 0 ? 'empty object' : undefined
      if (resolved.type === 'TSUnionType') return resolved.types.some((member) => unsafeValue(member, visited)) ? 'union' : undefined
      const name = bareReferenceName(resolved)
      if (name === undefined || visited.has(name)) return undefined
      if (emptyInterfaces.has(name)) return 'empty object'
      const alias = aliases.get(name)
      if (alias === undefined || alias.typeParameters) return undefined
      return unsafeValue(alias.typeAnnotation, new Set([...visited, name]))
    }

    /** Reports the value node of a dictionary when its value type is an escape hatch. */
    function report(valueType: ESTree.TSType): void {
      const value = unsafeValue(valueType)
      if (value !== undefined) context.report({ node: valueType, messageId: 'unsafeDictionary', data: { value } })
    }

    return {
      Program(node) {
        aliases = collectTypeAliases(node)
        locals = localNames(node)
        emptyInterfaces = emptyInterfaceNames(node)
      },
      TSTypeReference(node) {
        if (node.typeName.type !== 'Identifier' || node.typeName.name !== 'Record' || locals.has('Record')) return
        const value = node.typeArguments?.params[1]
        if (value !== undefined) report(value)
      },
      TSTypeLiteral(node) {
        const indexSignature = node.members.find((member) => member.type === 'TSIndexSignature')
        if (indexSignature?.typeAnnotation) report(indexSignature.typeAnnotation.typeAnnotation)
      },
      TSMappedType(node) {
        if (node.typeAnnotation) report(node.typeAnnotation)
      },
    }
  },
}
