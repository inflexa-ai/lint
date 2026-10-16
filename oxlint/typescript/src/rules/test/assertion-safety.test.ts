import { requireAssertionSafety } from '../require-assertion-safety.ts'
import { createRuleTester } from './rule-tester.ts'

const missing = { messageId: 'missingSafety' as const }

createRuleTester().run('require-assertion-safety', requireAssertionSafety, {
  valid: [
    // `as const` freezes a literal and widens nothing, so it makes no claim.
    `const config = { mode: 'dev' } as const`,
    `const tuple = [1, 2] as const`,
    // A SAFETY comment on the assertion's own line answers for it.
    `// SAFETY: the discriminant is checked above\nconst node = value as ElementNode`,
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
  ],
})
