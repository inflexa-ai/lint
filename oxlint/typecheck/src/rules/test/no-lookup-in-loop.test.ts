import { noLookupInLoop } from '../no-lookup-in-loop.ts'
import { createRuleTester } from './rule-tester.ts'

const header = `
type Row = { id: string; userId: string; tags: string[]; name: string }
type User = { id: string; name: string }
declare const rows: Row[]
declare const users: readonly User[]
declare const selected: string[]
declare const pair: [string, string]
declare const maybe: string[] | undefined
declare const name: string
declare const ids: Set<string>
declare function load(): string[]
`

const typed = (code: string) => `${header}${code}`
const reported = (code: string, receiver: string, method: string) => ({ code: typed(code), errors: [{ messageId: 'lookupInLoop', data: { receiver, method } }] })
const searched = (code: string, receiver: string) => ({ code: typed(code), errors: [{ messageId: 'searchInLoop', data: { receiver } }] })

createRuleTester().run('no-lookup-in-loop', noLookupInLoop, {
  valid: [
    // One scan outside of a loop costs one pass.
    typed(`const found = selected.includes('a')`),
    typed(`const user = users.find((user) => user.id === 'a')`),
    // The indexed form that the rule asks for.
    typed(`const chosen = new Set(selected)\nconst kept = rows.filter((row) => chosen.has(row.id))`),
    typed(`for (const row of rows) ids.has(row.id)`),
    // A string method of the same name is not a scan of an array.
    typed(`for (const row of rows) row.name.includes(name)`),
    typed(`const hits = rows.filter((row) => name.includes(row.name))`),
    // An array that each pass reads from its own element cannot be indexed one time.
    typed(`for (const row of rows) row.tags.includes('urgent')`),
    typed(`const urgent = rows.filter((row) => row.tags.includes('urgent'))`),
    typed(`for (const row of rows) { const local = load(); local.includes(row.id) }`),
    // A predicate that is not one equality has no keyed form.
    typed(`for (const row of rows) users.find((user) => user.name.startsWith(row.name))`),
    typed(`for (const row of rows) users.some((user) => user.id === row.userId && user.name === row.name)`),
    // The iterated expression of a for...of runs one time.
    typed(`for (const id of selected.filter((id) => id === name)) void id`),
    // A callback that the array does not call for each element.
    typed(`void Promise.resolve().then(() => selected.includes(name))`),
    // A receiver that a call gives is not the same array on each pass.
    typed(`for (const row of rows) load().includes(row.id)`),
    // A search by hand outside of a loop costs one pass.
    typed(`for (const s of selected) if (s === name) break`),
    // A nested loop over an array of the element, or with no equality to a value.
    typed(`for (const row of rows) for (const tag of row.tags) if (tag === 'urgent') break`),
    typed(`for (const row of rows) for (const user of users) if (user.name.startsWith(row.name)) break`),
    typed(`for (const row of rows) for (const user of users) if (row.id === name) break`),
    typed(`for (const row of rows) for (const s of selected) void s`),
    // A comparison inside a function that the inner loop only makes.
    typed(`declare function later(f: () => boolean): void\nfor (const row of rows) for (const s of selected) later(() => s === row.id)`),
  ],
  invalid: [
    reported(`for (const row of rows) selected.includes(row.id)`, 'selected', 'includes'),
    reported(`const kept = rows.filter((row) => selected.includes(row.id))`, 'selected', 'includes'),
    reported(`const owners = rows.map((row) => users.find((user) => user.id === row.userId))`, 'users', 'find'),
    reported(`const owners = rows.map(function (row) { return users.findIndex((user) => { return user.id === row.userId }) })`, 'users', 'findIndex'),
    reported(`for (let i = 0; i < rows.length; i++) selected.indexOf(rows[i].id)`, 'selected', 'indexOf'),
    reported(`let i = 0\nwhile (pair.includes(String(i))) i++`, 'pair', 'includes'),
    reported(`for (const row of rows) maybe?.includes(row.id)`, 'maybe', 'includes'),
    reported(`for (const row of rows) { const same = users.filter((user) => user.id == row.userId) }`, 'users', 'filter'),
    // The deduplication that a Set does in one pass.
    reported(`const seen: string[] = []\nfor (const row of rows) if (!seen.includes(row.id)) seen.push(row.id)`, 'seen', 'includes'),
    // A lookup inside a nested loop is a lookup inside the inner loop.
    reported(`for (const row of rows) for (const tag of row.tags) selected.includes(tag)`, 'selected', 'includes'),
    reported(
      `class Index { constructor(private readonly known: string[]) {}\n  count(): number { return rows.filter((row) => this.known.includes(row.id)).length } }`,
      'this.known',
      'includes',
    ),
    // The linear search by hand that does the work of `includes` and `find`.
    searched(`let n = 0\nfor (const row of rows) {\n  for (const s of selected) {\n    if (s === row.id) {\n      n += 1\n      break\n    }\n  }\n}`, 'selected'),
    searched(`const owners = rows.map((row) => {\n  for (const user of users) if (user.id === row.userId) return user\n  return undefined\n})`, 'users'),
    searched(`for (const row of rows) for (const { id } of users) if (row.userId == id) break`, 'users'),
  ],
})
