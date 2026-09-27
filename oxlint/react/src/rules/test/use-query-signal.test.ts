import { useQuerySignal } from '../use-query-signal.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()
const ignored = [{ messageId: 'ignoredSignal' as const }]

ruleTester.run('use-query-signal', useQuerySignal, {
  valid: [
    // Destructured, however it is spelled or renamed.
    `queryOptions({ queryKey: ['p'], queryFn: ({ signal }) => api.get('/projects', { signal }) })`,
    `queryOptions({ queryKey: ['p'], queryFn: ({ signal: ending }) => api.get('/projects', { signal: ending }) })`,
    `queryOptions({ queryKey: ['p'], queryFn: ({ signal, pageParam }) => api.get('/p', { signal }) })`,
    // Read off the context by name, at any depth.
    `useQuery({ queryKey: ['p'], queryFn: (context) => listProjects(api, { signal: context.signal }) })`,
    `useQuery({ queryKey: ['p'], queryFn: (context) => items.map(() => api.get('/p', { signal: context.signal })) })`,
    // Combined with a deadline.
    `queryOptions({ queryKey: ['s'], queryFn: ({ signal }) => api.get('/slow', { signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]) }) })`,
    // A reference to a function declared elsewhere is left to the types at its
    // own leaf; following the name would be dataflow.
    `queryOptions({ queryKey: ['p'], queryFn: listProjects })`,
    `useQuery({ queryKey: ['p'], queryFn: projects.list })`,
    // A `queryFn` with no `queryKey` beside it is not a query: what an
    // unrelated `.query({ queryFn })` looks like.
    `database.query({ queryFn: () => rows })`,
    `const options = { queryFn: () => api.get('/projects') }`,
    // Read through a literal key, which is the same read.
    `useQuery({ queryKey: ['p'], queryFn: (context) => run(() => api.get('/x', { signal: context['signal'] })) })`,
    // A mutation has no signal to use; `require-abort-signal` asks for its deadline.
    `useMutation({ mutationFn: (input) => api.post('/projects', input, { signal: AbortSignal.timeout(30_000) }) })`,
    `useQueries({ queries: paths.map((path) => ({ queryKey: [path], queryFn: ({ signal }) => api.get(path, { signal }) })) })`,
    `queryClient.query({ queryKey: ['p'], queryFn: ({ signal }) => api.get('/projects', { signal }) })`,
  ],
  invalid: [
    // A deadline of its own satisfies the other rule and cancels nothing on unmount.
    {
      code: `queryOptions({ queryKey: ['p'], queryFn: () => api.get('/projects', { signal: AbortSignal.timeout(5000) }) })`,
      errors: ignored,
    },
    { code: `useQuery({ queryKey: ['p'], queryFn: () => api.get('/projects', { signal }) })`, errors: ignored },
    { code: `useSuspenseQuery({ queryKey: ['p'], queryFn: function () { return api.get('/p', { signal }) } })`, errors: ignored },
    // A parameter named otherwise is still the context, and still unread.
    { code: `useQuery({ queryKey: ['p'], queryFn: (context) => api.get('/p', { signal: AbortSignal.timeout(5000) }) })`, errors: ignored },
    // Destructured, but not the signal.
    { code: `useInfiniteQuery({ queryKey: ['p'], queryFn: ({ pageParam }) => api.get(\`/p?page=\${pageParam}\`) })`, errors: ignored },
    // Destructured and then dropped: the signal was taken out of the context
    // and the request still went without anything to cancel it.
    {
      code: `queryOptions({ queryKey: ['p'], queryFn: ({ signal }) => api.get('/p', { signal: AbortSignal.timeout(5000) }) })`,
      errors: ignored,
    },
    { code: `useQuery({ queryKey: ['p'], queryFn: ({ signal: ending }) => api.get('/p') })`, errors: ignored },
    { code: `infiniteQueryOptions({ queryKey: ['p'], queryFn: ({ pageParam }) => api.get('/p') })`, errors: ignored },
    {
      code: `useQueries({ queries: [{ queryKey: ['a'], queryFn: () => api.get('/a') }, { queryKey: ['b'], queryFn: ({ signal }) => api.get('/b', { signal }) }] })`,
      errors: ignored,
    },
    { code: `queryClient.query({ queryKey: ['p'], queryFn: () => api.get('/projects') })`, errors: ignored },
    // Built above the call and passed in later: the pair is what makes it a
    // query, not where the object happens to sit.
    {
      code: `const options = { queryKey: ['p'], queryFn: () => api.get('/p', { signal: deadline }) }\nuseQuery(options)`,
      errors: ignored,
    },
    // Method shorthand and a function expression are written in place too.
    { code: `useQuery({ queryKey: ['p'], queryFn() { return api.get('/p') } })`, errors: ignored },
    { code: `useQuery({ queryKey: ['p'], queryFn: async function (context) { return api.get('/p') } })`, errors: ignored },
  ],
})
