import { noConditionalSpread } from '../no-conditional-spread.ts'
import { createRuleTester } from './rule-tester.ts'

const conditional = (direct = '') => ({ messageId: 'conditional' as const, data: { direct } })
const direct = (text: string) => conditional(` Here that is \`${text}\`.`)

createRuleTester().run('no-conditional-spread', noConditionalSpread, {
  valid: [
    `const run = { stderr, start: opts.start, signal: opts.signal }`,
    `const merged = { ...defaults, ...opts }`,
    // Spreading a value that may be undefined needs no guard at all.
    `const merged = { ...defaults, ...maybeOptions }`,
    `const merged = { ...build(opts) }`,
    // Arrays and call arguments have no direct form to write instead.
    `const plugins = [react(), ...(isBuild ? [uploader()] : [])]`,
    `const routes = [...base, ...(dev && devRoutes)]`,
    `run(...(verbose ? ['-v'] : []))`,
    // A conditional value is a plain assignment already.
    `const options = { mode: isDev ? 'development' : 'production' }`,
    `<Button {...props} />`,
  ],
  invalid: [
    {
      // The shape this rule exists for.
      code: `const run = { stderr, ...(opts.start === undefined ? {} : { start: opts.start }) }`,
      errors: [direct('start: opts.start')],
    },
    {
      code: `const run = { ...(opts.signal !== undefined ? { signal: opts.signal } : {}) }`,
      errors: [direct('signal: opts.signal')],
    },
    {
      code: `const run = { ...(opts.killGraceMs ? { killGraceMs: opts.killGraceMs } : undefined) }`,
      errors: [direct('killGraceMs: opts.killGraceMs')],
    },
    {
      code: `const run = { ...(frame.detail === undefined ? null : { detail: frame.detail }) }`,
      errors: [direct('detail: frame.detail')],
    },
    {
      code: `const part = { type: 'tool-call', ...(frame.detail && { detail: frame.detail }) }`,
      errors: [direct('detail: frame.detail')],
    },
    {
      code: `const headers = { ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}), ...request.headers }`,
      errors: [direct(`'Content-Type': 'application/json'`)],
    },
    {
      code: `const a = { ...(x ? { one: 1, two: 2 } : {}) }`,
      errors: [direct('one: 1, two: 2')],
    },
    {
      // Two real alternatives: there is no single direct form to suggest.
      code: `const a = { ...(x ? { one: 1 } : { two: 2 }) }`,
      errors: [conditional()],
    },
    {
      code: `const a = { ...(x ? defaults : {}) }`,
      errors: [conditional()],
    },
    {
      // Too long to repeat usefully inside a lint message.
      code: `const a = { ...(x ? { aVeryLongPropertyNameIndeed: someObject.withA.deeply.nested.path.toTheValue.thatGoesOnAndOn } : {}) }`,
      errors: [conditional()],
    },
    {
      code: `const a = { ...(x ? {\n  one: 1,\n} : {}) }`,
      errors: [direct('one: 1')],
    },
    {
      code: `const a = { ...(x ? {\n  one: 1,\n  two: 2,\n} : {}) }`,
      errors: [conditional()],
    },
    {
      // A type wrapper around the conditional does not hide it.
      code: `const a = { ...((x ? { one: 1 } : {}) as Partial<Options>) }`,
      errors: [direct('one: 1')],
    },
    {
      code: `const a = { ...(x === undefined ? {} : { x }), ...(y === undefined ? {} : { y }) }`,
      errors: [direct('x'), direct('y')],
    },
    {
      code: `const merged = { ...defaults, ...(opts ?? {}) }`,
      errors: [{ messageId: 'emptyFallback' as const, data: { operator: '??' } }],
    },
    {
      code: `const merged = { ...(opts || {}) }`,
      errors: [{ messageId: 'emptyFallback' as const, data: { operator: '||' } }],
    },
    {
      filename: 'component.tsx',
      code: `<Button {...(disabled ? { 'aria-disabled': true } : {})} />`,
      errors: [direct(`'aria-disabled': true`)],
    },
    {
      filename: 'component.tsx',
      code: `<Button {...(tooltip && { title: tooltip })} />`,
      errors: [direct('title: tooltip')],
    },
  ],
})
