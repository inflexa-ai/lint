import { Linter } from 'eslint'
import { expect, test } from 'vitest'
import { plugin } from '../../plugin.ts'
import { noInlineQueryKey } from '../no-inline-query-key.ts'
import { createTypedRuleTester, fixtureFile } from './rule-tester.ts'

const filename = fixtureFile('case.ts')

/**
 * Every case is a module in the fixture folder, so the parser can type what it
 * calls. `queryClient` is imported, which is the client the library's own rule
 * cannot see, and `local` is declared here, which is the one it can.
 */
const header = `
import { QueryClient, queryOptions, useQueryClient } from '@tanstack/react-query'
import { queryCache, queryClient } from './query-clients.ts'
declare const orgId: string
declare const key: readonly ['billing', string]
declare const filters: { queryKey: readonly ['billing', string] }
declare const billingQueries: {
  all: (orgId: string) => readonly ['billing', string]
  usage: (orgId: string) => { queryKey: readonly ['billing', string, 'usage'] }
}
declare const audit: { invalidateQueries: (filters: { queryKey: readonly unknown[] }) => void }
declare const map: Map<string, string>
const local = new QueryClient()
const reflect = Reflect
`

const typed = (code: string) => ({ filename, code: `${header}${code}` })
const reported = (code: string) => ({ ...typed(code), errors: [{ messageId: 'inlineQueryKey' as const }] })
const indirect = (code: string, through: string) => ({ ...typed(code), errors: [{ messageId: 'indirectCall' as const, data: { through } }] })

createTypedRuleTester().run('no-inline-query-key', noInlineQueryKey, {
  valid: [
    // Every way the key keeps one owner.
    typed(`void queryClient.invalidateQueries({ queryKey: billingQueries.all(orgId) })`),
    typed(`void queryClient.invalidateQueries({ queryKey: billingQueries.usage(orgId).queryKey })`),
    typed(`void queryClient.invalidateQueries({ queryKey: key })`),
    typed(`void queryClient.invalidateQueries({ ...filters })`),
    typed(`void queryClient.invalidateQueries({ ...filters, exact: true })`),
    typed(`queryClient.setQueryData(billingQueries.usage(orgId).queryKey, undefined)`),
    typed(`const queryKey = billingQueries.all(orgId)\nvoid queryClient.invalidateQueries({ queryKey })`),
    // A call with no key at all: the filter that drops the whole cache, and one
    // that matches on something else.
    typed(`void queryClient.invalidateQueries()`),
    typed(`void queryClient.invalidateQueries({ exact: true })`),
    typed(`queryClient.clear()`),
    // The array in the second position is the data, not a key.
    typed(`queryClient.setQueryData(key, ['a', 'b'])`),
    // Where a key is born, which is the entry of a data module. This is the one
    // call the rule must never reach.
    typed(`export const info = queryOptions({ queryKey: ['billing', orgId] as const, queryFn: ({ signal }) => Promise.resolve(signal.aborted) })`),
    // Another object's method of the same name, which is what a rule reading
    // the receiver's spelling would report.
    typed(`audit.invalidateQueries({ queryKey: ['billing', orgId] })`),
    // The indirection is only a finding when what it reaches is one.
    typed(`audit.invalidateQueries.call(audit, { queryKey: ['billing', orgId] })`),
    typed(`Reflect.apply(audit.invalidateQueries, audit, [{ queryKey: ['billing', orgId] }])`),
    typed(`void map.get.call(map, 'key')`),
    // A bound receiver hides nothing: the compiler keeps the method's signature,
    // thus the call that takes the key still resolves to the class.
    typed(`const bound = queryClient.invalidateQueries.bind(queryClient)`),
    typed(`void queryClient.invalidateQueries.bind(queryClient)({ queryKey: billingQueries.all(orgId) })`),
    // Nothing to ask without a program, so nothing is said.
    { code: `void queryClient.invalidateQueries({ queryKey: ['billing', orgId] })` },
  ],
  invalid: [
    // The whole point: a client this file imported, which `prefer-query-options`
    // leaves alone, and which is the client a loader and a handler take.
    reported(`void queryClient.invalidateQueries({ queryKey: ['billing', orgId] as const })`),
    reported(`void queryClient.invalidateQueries({ queryKey: ['billing', orgId] })`),
    // The client the library's own rule does see, reported here too.
    reported(`void local.invalidateQueries({ queryKey: ['billing', orgId] })`),
    // The client a component takes from the provider, which carries no name at all.
    reported(`void useQueryClient().invalidateQueries({ queryKey: ['billing', orgId] })`),
    // A key half taken from the factory is still a copy: the elements after the
    // spread are the half that drifts.
    reported(`void queryClient.invalidateQueries({ queryKey: [...billingQueries.all(orgId), 'usage'] })`),
    // A filters object, whichever method takes one.
    reported(`queryClient.removeQueries({ queryKey: ['billing', orgId] })`),
    reported(`void queryClient.cancelQueries({ queryKey: ['billing', orgId] })`),
    reported(`void queryClient.resetQueries({ queryKey: ['billing', orgId] })`),
    reported(`void queryClient.refetchQueries({ queryKey: ['billing', orgId] })`),
    reported(`void queryClient.getQueriesData({ queryKey: ['billing', orgId] })`),
    reported(`void queryClient.setQueriesData({ queryKey: ['billing', orgId] }, undefined)`),
    reported(`void queryClient.isFetching({ queryKey: ['billing', orgId] })`),
    // An options object, where the key sits beside the function that fills it.
    reported(`void queryClient.fetchQuery({ queryKey: ['billing', orgId], queryFn: ({ signal }) => Promise.resolve(signal.aborted) })`),
    reported(`void queryClient.prefetchQuery({ queryKey: ['billing', orgId], queryFn: ({ signal }) => Promise.resolve(signal.aborted) })`),
    reported(`void queryClient.ensureQueryData({ queryKey: ['billing', orgId], queryFn: ({ signal }) => Promise.resolve(signal.aborted) })`),
    reported(`void queryClient.query({ queryKey: ['billing', orgId], queryFn: ({ signal }) => Promise.resolve(signal.aborted) })`),
    // The key as the argument itself.
    reported(`void queryClient.getQueryData(['billing', orgId])`),
    reported(`void queryClient.getQueryState(['billing', orgId])`),
    reported(`queryClient.setQueryData(['billing', orgId], undefined)`),
    reported(`queryClient.setQueryDefaults(['billing', orgId], { retry: false })`),
    // The cache behind the client takes the same filters and matches the same
    // entries.
    reported(`void queryCache.findAll({ queryKey: ['billing', orgId] })`),
    // The method reached every other way a caller can reach it.
    reported(`void queryClient?.invalidateQueries({ queryKey: ['billing', orgId] })`),
    reported(`void (queryClient.invalidateQueries)({ queryKey: ['billing', orgId] })`),
    reported(`const invalidate = queryClient.invalidateQueries\nvoid invalidate({ queryKey: ['billing', orgId] })`),
    // Written into an object that a spread also contributed to.
    reported(`void queryClient.invalidateQueries({ ...filters, queryKey: ['billing', orgId] })`),
    // A bound receiver is no indirection, so the key at the later call is read
    // as it is anywhere else. This is what keeps `bind` out of the list above.
    reported(`void queryClient.invalidateQueries.bind(queryClient)({ queryKey: ['billing', orgId] })`),
    // Reached through an indirection the arguments cannot be read past, whatever
    // those arguments are: a key from a factory looks the same through it.
    indirect(`void queryClient.invalidateQueries.call(queryClient, { queryKey: ['billing', orgId] })`, 'Function.prototype.call'),
    indirect(`void queryClient.invalidateQueries.call(queryClient, filters)`, 'Function.prototype.call'),
    indirect(`void queryClient.invalidateQueries.apply(queryClient, [filters])`, 'Function.prototype.apply'),
    indirect(`void queryCache.findAll.call(queryCache, filters)`, 'Function.prototype.call'),
    // An argument bound beside the receiver is one no later call shows.
    indirect(`queryClient.setQueryData.bind(queryClient, ['billing', orgId])`, 'Function.prototype.bind'),
    // The computed spelling of the same member, which resolves to the same
    // declaration and is the same finding.
    indirect(`void queryClient.invalidateQueries['call'](queryClient, filters)`, 'Function.prototype.call'),
    indirect(`void queryClient.invalidateQueries['apply'](queryClient, [filters])`, 'Function.prototype.apply'),
    // The method as an argument rather than as a receiver, under any spelling
    // of the namespace it is reached through.
    indirect(`void Reflect.apply(queryClient.invalidateQueries, queryClient, [filters])`, 'Reflect.apply'),
    indirect(`void reflect.apply(queryClient.invalidateQueries, queryClient, [filters])`, 'Reflect.apply'),
    indirect(`void globalThis.Reflect.apply(queryClient.invalidateQueries, queryClient, [filters])`, 'Reflect.apply'),
  ],
})

// The same call, parsed without a program: the rule stops the run rather than
// read the name of the variable, and a green run never hides a rule that saw nothing.
test('no-inline-query-key stops a run that gives no type information', () => {
  const config: Linter.Config = { plugins: { '@inflexa-ai/react': plugin }, rules: { '@inflexa-ai/react/no-inline-query-key': 'error' } }
  expect(() => new Linter().verify(`void queryClient.invalidateQueries({ queryKey: ['billing', orgId] })`, config)).toThrow(
    '@inflexa-ai/react/no-inline-query-key needs the type information of typescript-eslint',
  )
})
