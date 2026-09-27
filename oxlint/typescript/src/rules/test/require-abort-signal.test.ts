import { Linter } from 'eslint'
import { expect, test } from 'vitest'
import { plugin } from '../../plugin.ts'
import { requireAbortSignal } from '../require-abort-signal.ts'
import { createTypedRuleTester, fixtureFile } from './rule-tester.ts'

const options: [{ declaredIn: string[] }] = [{ declaredIn: ['/fixtures/api-client/src/'] }]
const filename = fixtureFile('case.ts')

/** Every case is a module in the fixture folder, so the parser can type what it calls. */
const header = `
import { api, org, pubchem, upload } from './clients.ts'
declare const signal: AbortSignal
declare const maybe: AbortSignal | undefined
declare const chunk: Blob
declare const map: Map<string, string>
declare const store: { delete: (id: string) => void }
declare const held: { signal: AbortSignal; cache: RequestCache }
declare const loose: { signal?: AbortSignal }
declare const untyped: any
declare function clientFor(id: string): typeof api
const reflect = Reflect
`

const typed = (code: string) => ({ filename, options, code: `${header}${code}` })
const reported = (code: string, count = 1) => ({ ...typed(code), errors: Array.from({ length: count }, () => ({ messageId: 'missingSignal' as const })) })
const indirect = (code: string, through: string) => ({ ...typed(code), errors: [{ messageId: 'indirectCall' as const, data: { through } }] })

createTypedRuleTester().run('require-abort-signal', requireAbortSignal, {
  valid: [
    // A signal whose type cannot be undefined, however the options were built.
    typed(`void api.get('/projects', { signal })`),
    typed(`void api.get('/projects', held)`),
    typed(`void api.get('/projects', { ...held, cache: 'no-store' })`),
    typed(`void org.fetch('/notifications/stream', { headers: { Accept: 'text/event-stream' }, signal })`),
    typed(`void api.post('/projects', { name: 'Atlas' }, { signal: AbortSignal.timeout(30_000) })`),
    typed(`void api.get('/slow', { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) })`),
    typed(`void upload('https://bucket.test/o', { method: 'PUT', body: chunk, signal })`),
    // Another object's method of the same name, and a client method with
    // nowhere to put a signal.
    typed(`void map.get('key')`),
    typed(`store.delete('p1')`),
    typed(`void api.withPrefix('/organizations/7')`),
    // The indirection is only a finding when what it reaches is one, under every
    // spelling of the indirection.
    typed(`void map.get.call(map, 'key')`),
    typed(`void map.get['call'](map, 'key')`),
    typed(`void Reflect.apply(map.get, map, ['key'])`),
    // A bound receiver hides nothing: the compiler keeps the method's own
    // signature, thus the call that takes the options still resolves to the
    // client and the signal is read there.
    typed(`const bound = api.get.bind(api)`),
    typed(`void api.get.bind(api)('/projects', { signal })`),
    // Nothing to ask without a program: a guess from the name is what this rule
    // exists to avoid.
    { ...typed(`void api.get('/projects')`), options: [{ declaredIn: [] }] },
  ],
  invalid: [
    reported(`void api.get('/projects')`),
    reported(`void org.post('/runs', { name: 'a' }, { query: { dryRun: true } })`),
    reported(`void api.delete('/projects/p1')`),
    // The leaf is where an optional signal is settled; declaring
    // `signal: AbortSignal` is what makes the caller above supply one. Which of
    // the two it is, asserted: a reader told `undefined` checks for the wrong
    // one, and the branch that says so is otherwise indistinguishable from the
    // one below it.
    {
      ...typed(`void api.get('/projects', loose)`),
      errors: [{ messageId: 'missingSignal' as const, data: { problem: 'its `signal` is optional, so it may be missing' } }],
    },
    {
      ...typed(`void api.get('/projects', { signal: maybe })`),
      errors: [{ messageId: 'missingSignal' as const, data: { problem: 'its `signal` may be `undefined`' } }],
    },
    reported(`void api.get('/projects', untyped)`),
    // The same method, reached every other way a caller can reach it.
    reported(`const get = api.get\nvoid get('/projects')`),
    reported(`void api?.get('/projects')`),
    reported(`void (api.get)('/projects')`),
    reported(`void clientFor('7').get('/projects')`),
    // Every shape of the platform fetch.
    reported(`void upload('https://bucket.test/o', { method: 'PUT', body: chunk })`),
    reported(`void org.fetch('/notifications/stream', { headers: { Accept: 'text/event-stream' } })`),
    reported(`export function send(fetch: typeof globalThis.fetch) { return fetch('https://x.test/y') }`),
    // A signal a `Request` carries cannot be read from here, so the init is
    // still where one goes.
    reported(`void upload(new Request('https://bucket.test/o', { signal }))`),
    // A mutation gets no signal from its library, so it is given a deadline,
    // and the message has to be the thing that says so.
    {
      ...typed(`export const save = { mutationFn: (input: { name: string }) => api.post('/projects', input) }`),
      // The deadline advice is in the template of `missingSignal` itself.
      errors: [{ messageId: 'missingSignal' as const }],
    },
    // Reached through an indirection the options cannot be read past.
    indirect(`void api.get.call(api, '/projects', { signal })`, 'Function.prototype.call'),
    indirect(`void api.get.apply(api, ['/projects', { signal }])`, 'Function.prototype.apply'),
    indirect(`void Reflect.apply(api.get, api, ['/projects', { signal }])`, 'Reflect.apply'),
    indirect(`void upload.call(globalThis, 'https://bucket.test/o', { signal })`, 'Function.prototype.call'),
    // The computed spelling of the same member, which resolves to the same
    // declaration and is the same finding.
    indirect(`void api.get['call'](api, '/projects', { signal })`, 'Function.prototype.call'),
    indirect(`void api.get['apply'](api, ['/projects', { signal }])`, 'Function.prototype.apply'),
    // The namespace under any spelling, because the declaration decides and not
    // the text at the call.
    indirect(`void reflect.apply(api.get, api, ['/projects', { signal }])`, 'Reflect.apply'),
    indirect(`void globalThis.Reflect.apply(api.get, api, ['/projects', { signal }])`, 'Reflect.apply'),
    // An argument bound beside the receiver is one no later call shows.
    indirect(`const bound = api.get.bind(api, '/projects')`, 'Function.prototype.bind'),
    // A bound receiver leaves the options where the direct path reads them, so
    // a missing signal there is the ordinary finding and not the indirect one.
    reported(`void api.get.bind(api)('/projects')`),
    // An untrusted client is the same client.
    reported(`void pubchem.get('/compounds/aspirin', { schema: undefined as never })`),
  ],
})

// The same call, parsed without a program: the rule stops the run rather than
// read the name of the variable, and a green run never hides a rule that saw nothing.
test('require-abort-signal stops a run that gives no type information', () => {
  const config: Linter.Config = { plugins: { '@inflexa-ai': plugin }, rules: { '@inflexa-ai/require-abort-signal': ['error', ...options] } }
  expect(() => new Linter().verify(`void api.get('/projects')`, config)).toThrow('@inflexa-ai/require-abort-signal needs the type information of typescript-eslint')
})
