import { noUnboundedPromiseAll } from '../no-unbounded-promise-all.ts'
import { createRuleTester } from './rule-tester.ts'

const hint = 'Run the calls through a queue of fixed width: the `mapWithLimit` function of the document of this rule, or a library such as `p-limit`.'
const unbounded = (combinator: string, fanOut: string, text = hint) => ({ messageId: 'unbounded' as const, data: { combinator, fanOut, hint: text } })

createRuleTester().run('no-unbounded-promise-all', noUnboundedPromiseAll, {
  valid: [
    // The size of a literal array is in the code.
    `await Promise.all([loadUser(id), loadProjects(id)])`,
    `await Promise.all([a, b].map(load))`,
    // The start of a pool of workers: its size is the width.
    `await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, work))`,
    // A list of promises that something else made, with a size this rule cannot see.
    `await Promise.all(pending)`,
    `const results = items.map(transform)`,
  ],
  invalid: [
    { code: `await Promise.all(items.map(fetchOne))`, errors: [unbounded('all', 'map')] },
    { code: `await Promise.allSettled(ids.map(async (id) => api.get(id)))`, errors: [unbounded('allSettled', 'map')] },
    { code: `await Promise.all(groups.flatMap((group) => group.ids.map(load)))`, errors: [unbounded('all', 'flatMap')] },
    { code: `await Promise.all(Array.from(ids, load))`, errors: [unbounded('all', 'Array.from')] },
    { code: `await Promise.any([...mirrors.map(download)])`, errors: [unbounded('any', 'map')] },
    { code: `await globalThis.Promise.race(urls.map(ping) as Promise<void>[])`, errors: [unbounded('race', 'map')] },
    {
      code: `await Promise.all(items.map(fetchOne))`,
      options: [{ hint: 'Use `items.go({ concurrency, signal, failFast })`.' }],
      errors: [unbounded('all', 'map', 'Use `items.go({ concurrency, signal, failFast })`.')],
    },
  ],
})
