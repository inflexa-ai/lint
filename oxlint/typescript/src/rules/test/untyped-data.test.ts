import { noDoubleCast } from '../no-double-cast.ts'
import { noInstanceofError } from '../no-instanceof-error.ts'
import { noTypeofObject } from '../no-typeof-object.ts'
import { noUnknownTypeGuards } from '../no-unknown-type-guards.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

const unknownGuard = (name: string) => ({ messageId: 'unknownGuard' as const, data: { name } })

ruleTester.run('no-unknown-type-guards', noUnknownTypeGuards, {
  valid: [
    // Narrowing a union the program already knows is a statement about types, not validation.
    `function isToolCall(part: ChatPart): part is ToolCallPart { return part.type === 'tool-call' }`,
    `const isTerminal = (status: RunStatus): status is 'completed' | 'failed' => status !== 'running'`,
    `function isDefined<T>(value: T | undefined): value is T { return value !== undefined }`,
    // An ordinary predicate that returns boolean makes no claim to the compiler.
    `function isEmpty(value: unknown): boolean { return value == null }`,
    `const schema = z.object({ message: z.string() })`,
    // Declaring a guard's type is not writing one.
    `type Guard<T> = (value: unknown) => value is T`,
    // A function with no return type makes no claim.
    `function check(value: unknown) { return value != null }`,
  ],
  invalid: [
    {
      // The one that gets redeclared in every file that needs it.
      code: `function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }`,
      errors: [unknownGuard('isRecord')],
    },
    {
      code: `const isUser = (value: unknown): value is User => true`,
      errors: [unknownGuard('isUser')],
    },
    { code: `const isUser = function (value: any): value is User { return true }`, errors: [unknownGuard('isUser')] },
    { code: `function isUser(value): value is User { return true }`, errors: [unknownGuard('isUser')] },
    {
      // An assertion function over unknown is the same validator with a throw.
      code: `function assertUser(value: unknown): asserts value is User { if (!value) throw new Error('no') }`,
      errors: [unknownGuard('assertUser')],
    },
    { code: `const guards = { isUser(value: unknown): value is User { return true } }`, errors: [unknownGuard('isUser')] },
    { code: `class Guards { isUser(value: unknown): value is User { return true } }`, errors: [unknownGuard('isUser')] },
    { code: `declare function isUser(value: unknown): value is User`, errors: [unknownGuard('isUser')] },
    {
      // Only the parameter the predicate names decides it.
      code: `function isUser(options: Options, value: unknown): value is User { return true }`,
      errors: [unknownGuard('isUser')],
    },
    { code: `export default (value: unknown): value is User => true`, errors: [unknownGuard('This function')] },
  ],
})

ruleTester.run('no-typeof-object', noTypeofObject, {
  valid: [
    // Narrowing a known union by its primitive member is ordinary TypeScript.
    `if (typeof id === 'string') use(id)`,
    `const isCallback = typeof handler === 'function'`,
    `if (typeof window === 'undefined') return`,
    `const kind = typeof value`,
    `if (value === 'object') use(value)`,
  ],
  invalid: [
    { code: `if (typeof parsed === 'object' && parsed !== null) use(parsed)`, errors: [{ messageId: 'typeofObject' as const, data: { operator: '===' } }] },
    { code: `if (typeof parsed !== 'object' || parsed === null) return undefined`, errors: [{ messageId: 'typeofObject' as const, data: { operator: '!==' } }] },
    { code: `if ('object' === typeof parsed) use(parsed)`, errors: [{ messageId: 'typeofObject' as const, data: { operator: '===' } }] },
    { code: `if (typeof parsed == "object") use(parsed)`, errors: [{ messageId: 'typeofObject' as const, data: { operator: '==' } }] },
    { code: `const ok = typeof body.data === 'object'`, errors: [{ messageId: 'typeofObject' as const }] },
  ],
})

const errorCheck = (check: string) => ({ messageId: 'errorCheck' as const, data: { check } })

ruleTester.run('no-instanceof-error', noInstanceofError, {
  valid: [
    // A failure the code understands is checked by its own class.
    `if (error instanceof ApiError && error.status === 409) showConflict()`,
    `const isFormData = body instanceof FormData`,
    `if (error instanceof TypeError) retry()`,
    `throw new UploadError('upload failed', { cause })`,
    // Only `Error.isError` asks this rule's question; another object's method
    // and a bare call are someone else's `isError`.
    `if (Result.isError(outcome)) show(outcome.reason)`,
    `if (isError(outcome)) show(outcome.reason)`,
    `Error.captureStackTrace(target)`,
    // A binding of one's own that happens to share the name is not the global.
    `function check(Error) { return thrown instanceof Error }`,
    `import { Error } from './protocol.ts'\nconst framed = thrown instanceof Error`,
    {
      // The one module that normalises thrown values is named in the rule's options.
      filename: 'packages/telemetry/src/to-error.ts',
      code: `export const toError = (thrown: unknown) => (thrown instanceof Error ? thrown : new Error('A value that is not an Error was thrown', { cause: thrown }))`,
      options: [{ allowIn: ['/to-error\\.ts$'] }],
    },
    {
      filename: 'packages/telemetry/src/to-error.ts',
      code: `export const toError = (thrown: unknown) => (Error.isError(thrown) ? thrown : new Error('A value that is not an Error was thrown', { cause: thrown }))`,
      options: [{ allowIn: ['/to-error\\.ts$'] }],
    },
  ],
  invalid: [
    { code: `const message = error instanceof Error ? error.message : String(error)`, errors: [errorCheck('instanceof Error')] },
    { code: `try { run() } catch (error) { if (error instanceof Error) log(error.stack) }`, errors: [errorCheck('instanceof Error')] },
    { code: `if (!(cause instanceof Error)) throw cause`, errors: [errorCheck('instanceof Error')] },
    {
      filename: 'apps/lumen/src/modules/files/upload.ts',
      code: `const e = thrown instanceof Error ? thrown : new Error(String(thrown))`,
      options: [{ allowIn: ['/to-error\\.ts$'] }],
      errors: [errorCheck('instanceof Error')],
    },
    // The global reached through the global object is the global, so the check
    // is named after what it reads and not after how it was spelled.
    { code: `const message = thrown instanceof globalThis.Error`, errors: [errorCheck('instanceof Error')] },
    { code: `const message = thrown instanceof window.Error`, errors: [errorCheck('instanceof Error')] },
    { code: `const message = thrown instanceof self['Error']`, errors: [errorCheck('instanceof Error')] },
    { code: `if (globalThis.Error.isError(thrown)) log(thrown.stack)`, errors: [errorCheck('Error.isError')] },
    // The ES2026 spelling of the same check, in every form it can be written.
    { code: `if (Error.isError(thrown)) log(thrown.stack)`, errors: [errorCheck('Error.isError')] },
    { code: `if (Error['isError'](thrown)) log(thrown.stack)`, errors: [errorCheck('Error.isError')] },
    { code: `if (Error.isError?.(thrown)) log(thrown.stack)`, errors: [errorCheck('Error.isError')] },
    { code: `const message = Error.isError(error) ? error.message : 'failed'`, errors: [errorCheck('Error.isError')] },
    {
      filename: 'apps/lumen/src/modules/files/upload.ts',
      code: `const e = Error.isError(thrown) ? thrown : new Error(String(thrown))`,
      options: [{ allowIn: ['/to-error\\.ts$'] }],
      errors: [errorCheck('Error.isError')],
    },
  ],
})

ruleTester.run('no-double-cast', noDoubleCast, {
  valid: [
    `const count = value as number`,
    `const el = document.getElementById('root') as HTMLDivElement`,
    `const opaque = value as unknown`,
    `const config = { mode: 'dev' } as const`,
    `const user = UserSchema.parse(data)`,
    // Widening and then a checked narrowing is not an escape through unknown.
    `const id = (value as string | number) as string`,
  ],
  invalid: [
    { code: `const user = data as unknown as User`, errors: [{ messageId: 'doubleCast' as const, data: { via: 'unknown' } }] },
    { code: `const user = data as any as User`, errors: [{ messageId: 'doubleCast' as const, data: { via: 'any' } }] },
    { code: `const store = ({} as unknown) as StoreApi<State>`, errors: [{ messageId: 'doubleCast' as const, data: { via: 'unknown' } }] },
    { code: `const fetchMock = vi.fn() as unknown as typeof fetch`, errors: [{ messageId: 'doubleCast' as const, data: { via: 'unknown' } }] },
    { filename: 'legacy.ts', code: `const user = <User>(<unknown>data)`, errors: [{ messageId: 'doubleCast' as const, data: { via: 'unknown' } }] },
  ],
})
