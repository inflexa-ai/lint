import { noAccumulatingCopy } from '../no-accumulating-copy.ts'
import { createRuleTester } from './rule-tester.ts'

const copy = (form: string) => ({ messageId: 'accumulatingCopy' as const, data: { form } })

createRuleTester().run('no-accumulating-copy', noAccumulatingCopy, {
  valid: [
    // An accumulator that grows in place.
    `const all = groups.reduce((acc, group) => { acc.push(...group); return acc }, [])`,
    `const byId = users.reduce((acc, user) => { acc[user.id] = user; return acc }, {})`,
    // One copy outside of a loop costs one pass.
    `const merged = Object.assign({}, defaults, options)`,
    `const all = head.concat(tail)`,
    // A copy of another array, not of the accumulator.
    `const out = rows.reduce((acc, row) => acc + other.concat(row).length, 0)`,
    `for (const row of rows) { const next = seen.concat(row) }`,
    // A callback of a method that is not a reducer.
    `const lists = rows.map((acc) => acc.concat(extra))`,
  ],
  invalid: [
    { code: `const all = groups.reduce((acc, group) => acc.concat(group), [])`, errors: [copy('acc.concat(…)')] },
    { code: `const all = groups.reduceRight(function (list, group) { return list.concat(group) }, [])`, errors: [copy('list.concat(…)')] },
    { code: `const byId = users.reduce((acc, user) => Object.assign({}, acc, { [user.id]: user }), {})`, errors: [copy('Object.assign({}, acc, …)')] },
    { code: `let all = []\nfor (const group of groups) all = all.concat(group)`, errors: [copy('all.concat(…)')] },
    { code: `let byId = {}\nwhile (more()) byId = Object.assign({}, byId, next())`, errors: [copy('Object.assign({}, byId, …)')] },
  ],
})
