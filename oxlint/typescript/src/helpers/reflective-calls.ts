import ts from 'typescript'

/**
 * The interfaces that give every function `call`, `apply` and `bind`. A call
 * through one of them resolves here rather than to the method it reaches, which
 * is what puts the method's own arguments beyond a rule that reads a call site.
 * Both names are listed because which of the two the compiler uses depends on
 * `strictBindCallApply`, and a check that read only the stricter one would go
 * quiet for a project that turned the flag off.
 */
const FUNCTION_INTERFACES = new Set(['CallableFunction', 'Function'])

/** The members of those interfaces that take a method's own arguments out of reach. */
const REFLECTIVE_MEMBERS = new Set(['call', 'apply', 'bind'])

/**
 * The reflective member a call resolved to, when it resolved to one. Read off
 * the declaration the compiler picked rather than off the source text, thus
 * `f['call'](…)` is the same finding as `f.call(…)`.
 */
function reflectiveMemberOf(signature: ts.Signature): string | undefined {
  const declaration = signature.declaration
  if (declaration === undefined || ts.isJSDocSignature(declaration) || !declaration.getSourceFile().isDeclarationFile) return undefined

  const owner = declaration.parent
  if (!ts.isInterfaceDeclaration(owner) || !FUNCTION_INTERFACES.has(owner.name.text)) return undefined

  const name = declaration.name
  return name !== undefined && ts.isIdentifier(name) && REFLECTIVE_MEMBERS.has(name.text) ? name.text : undefined
}

/**
 * Whether `Reflect.apply` is what a call resolved to. The namespace that holds
 * the declaration decides, not the text at the call, so an alias and a
 * `globalThis.Reflect` are the same finding as the plain spelling.
 */
function isReflectApply(signature: ts.Signature): boolean {
  const declaration = signature.declaration
  if (declaration === undefined || !ts.isFunctionDeclaration(declaration) || declaration.name?.text !== 'apply') return false

  const body = declaration.parent
  if (!ts.isModuleBlock(body)) return false
  return ts.isIdentifier(body.parent.name) && body.parent.name.text === 'Reflect'
}

/**
 * The name of the indirection a call reaches its target through, or `undefined`
 * where it reaches one directly or reaches nothing that matters.
 *
 * A rule that reads what a call was given has to see the call. Through `call`,
 * `apply` and `Reflect.apply` it sees an argument list or an array instead, so
 * a correct call and the one the rule exists to report look alike. The
 * indirection is thus the finding by itself, whatever the arguments are: app
 * code has no need for it, and it is the shape an author reaches for to get
 * past a rule.
 *
 * `bind` is the exception, and only where it carries a receiver alone. The
 * compiler keeps the method's own signature on the value it returns, so the
 * later call resolves to the method again and the arguments are read there. An
 * argument bound beside the receiver is one that no later call shows, and that
 * is the indirection again.
 *
 * `reachesTarget` says whether a value is one the calling rule cares about, and
 * it is asked about a type rather than a name, so an unrelated `map.get.call(…)`
 * stays silent. `signature` is the one that `call` resolved to.
 */
export function indirectionOf(call: ts.CallExpression, signature: ts.Signature, reachesTarget: (node: ts.Node) => boolean): string | undefined {
  const through = reflectiveMemberOf(signature)
  if (through !== undefined) {
    if (through === 'bind' && call.arguments.length < 2) return undefined

    const callee = call.expression
    const receiver = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee) ? callee.expression : undefined
    return receiver !== undefined && reachesTarget(receiver) ? `Function.prototype.${through}` : undefined
  }

  // `Reflect.apply(api.get, api, args)` carries the target as its first
  // argument rather than as its receiver, thus the check above, which reads a
  // receiver, passes it by.
  if (!isReflectApply(signature)) return undefined
  const target = call.arguments[0]
  return call.arguments.length > 0 && !ts.isSpreadElement(target) && reachesTarget(target) ? 'Reflect.apply' : undefined
}
