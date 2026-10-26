import { requireAssertionSafety } from '../require-assertion-safety.ts'
import { createRuleTester } from './rule-tester.ts'

const missing = { messageId: 'missingSafety' as const }
const guard = { messageId: 'uncheckedGuard' as const }
const overload = { messageId: 'uncheckedOverload' as const }

createRuleTester().run('require-assertion-safety', requireAssertionSafety, {
  valid: [
    // `as const` freezes a literal and widens nothing, so it makes no claim.
    `const config = { mode: 'dev' } as const`,
    `const tuple = [1, 2] as const`,
    // A SAFETY comment on the assertion's own line answers for it.
    `// SAFETY: the parser builds only element nodes\nconst node = value as ElementNode`,
    // A SAFETY comment on the statement that holds the assertion answers too.
    `function read() {\n  // SAFETY: the backend contract is ours\n  return parsed as TResponse\n}`,
    `// SAFETY: built by the runtime a line above\nconst el = ref.current as HTMLDivElement`,
    // A statement in a body without braces belongs to its `if` or loop.
    `// SAFETY: the guard narrows it\nif (isNode(value)) return value as ElementNode`,
    `// SAFETY: each branch narrows it\nif (a) f()\nelse if (b) g(value as ElementNode)`,
    `// SAFETY: each entry is a number\nfor (const v of values) total += v as number`,
    // A comment above an exported declaration answers for the assertion in it.
    `// SAFETY: the runtime built it\nexport const el = ref.current as HTMLDivElement`,
    // No assertion, nothing to justify.
    `const user = UserSchema.parse(data)`,
    `const value = input satisfies Config`,
    // A guard with the invariant beside it answers for its claim.
    `// SAFETY: the kind field decides the variant\nfunction isFoo(x: FooBar): x is Foo { return x.kind === 'foo' }`,
    `// SAFETY: the kind field decides the variant\nexport function isFoo(x: FooBar): x is Foo { return x.kind === 'foo' }`,
    `class Guards {\n  // SAFETY: the kind field decides the variant\n  isFoo(x: FooBar): x is Foo { return x.kind === 'foo' }\n}`,
    // A guard over untyped data is the concern of no-unknown-type-guards.
    `function isUser(value: unknown): value is User { return true }`,
    `function isUser(value: any): value is User { return true }`,
    `function isUser(value): value is User { return true }`,
    `function isUser(value: object): value is User { return true }`,
    `function isUser(value: {}): value is User { return true }`,
    `function isUser(value: Record<string, unknown>): value is User { return true }`,
    `function assertUser(value: unknown): asserts value is User {}`,
    // A predicate that TypeScript infers from the body is checked.
    `const foos = parts.filter((part) => part.kind === 'foo')`,
    // An assertion of truth names no type, and a declaration has no body to check.
    `function assertReady(state: State): asserts state {}`,
    `declare function isFoo(x: FooBar): x is Foo`,
    `type Guard = (x: FooBar) => x is Foo`,
    // An overload set whose implementation returns the same type casts nothing.
    `function parse(x: string): Foo\nfunction parse(x: number): Foo\nfunction parse(x: string | number): Foo { return make(x) }`,
    `function parse(x: string): Foo\nfunction parse(x: string) { return make(x) }`,
    // A SAFETY comment on the overload set or on the implementation answers for it.
    `// SAFETY: make returns a Foo for a string\nfunction cast(x: string): Foo\nfunction cast(x: string): object { return make(x) }`,
    `function cast(x: string): Foo\n// SAFETY: make returns a Foo for a string\nfunction cast(x: string): object { return make(x) }`,
    // Ambient overloads have no implementation to check.
    `declare function cast(x: string): Foo\ndeclare function cast(x: number): Bar`,
  ],
  invalid: [
    { code: `const node = value as ElementNode`, errors: [missing] },
    { code: `function read() { return parsed as TResponse }`, errors: [missing] },
    { code: `const el = document.getElementById('root') as HTMLDivElement`, errors: [missing] },
    // A comment that is not a SAFETY comment does not answer for it.
    { code: `// value is really a node\nconst node = value as ElementNode`, errors: [missing] },
    // The justification has to sit before the assertion, not after it.
    { code: `const node = value as ElementNode // SAFETY: too late`, errors: [missing] },
    // The angle-bracket form is the same assertion.
    { filename: 'legacy.ts', code: `const node = <ElementNode>value`, errors: [missing] },
    // A comment above an `if` does not reach into its block.
    { code: `function f() {\n  // SAFETY: the guard narrows it\n  if (isNode(value)) {\n    return value as ElementNode\n  }\n}`, errors: [missing] },
    // A comment above a function does not reach a cast in an `if` test.
    { code: `// SAFETY: the flag is a boolean\nfunction f() {\n  if (flag as boolean) {}\n}`, errors: [missing] },
    // Each assertion answers for itself.
    { code: `const pair = [a as First, b as Second]`, errors: [missing, missing] },
    // A type predicate over a known type is an `as` that TypeScript does not check.
    { code: `function isFoo(x: FooBar): x is Foo { return x.kind === 'bar' }`, errors: [guard] },
    { code: `export const isFoo = (x: FooBar): x is Foo => x.kind === 'foo'`, errors: [guard] },
    { code: `function assertFoo(x: FooBar): asserts x is Foo { if (x.kind !== 'foo') throw new Error('no') }`, errors: [guard] },
    { code: `class Guards { isFoo(x: FooBar): x is Foo { return true } }`, errors: [guard] },
    { code: `const foos = parts.filter((part): part is Foo => part.kind === 'foo')`, errors: [guard] },
    { code: `function isAdmin(roles: Record<string, Role>): roles is Record<string, AdminRole> { return true }`, errors: [guard] },
    // A comment before the class does not answer for each method in it.
    { code: `// SAFETY: the kind field decides the variant\nclass Guards {\n  isFoo(x: FooBar): x is Foo { return true }\n}`, errors: [guard] },
    // An overload whose implementation returns a different type is an unchecked cast.
    { code: `function cast(x: string): Foo\nfunction cast(x: string): object { return { x } }`, errors: [overload] },
    { code: `export function cast(x: string): Foo\nexport function cast(x: unknown): unknown { return x }`, errors: [overload] },
    { code: `function read(x: string): Foo\nfunction read(x: number): Bar\nfunction read(x: string | number): Foo | Bar { return load(x) }`, errors: [overload] },
    { code: `class Reader {\n  read(x: string): Foo\n  read(x: string): object { return { x } }\n}`, errors: [overload] },
    { code: `function outer() {\n  function cast(x: string): Foo\n  function cast(x: string): object { return { x } }\n}`, errors: [overload] },
  ],
})
