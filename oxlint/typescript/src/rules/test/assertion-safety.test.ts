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
    // Each assertion answers for itself.
    { code: `const pair = [a as First, b as Second]`, errors: [missing, missing] },
  ],
})
