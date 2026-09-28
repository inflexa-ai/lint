import { AssertionError } from 'node:assert'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { createRuleTester, RuleTester, type TestCases } from '../rule-tester.ts'
import { plugin } from './test-plugin.ts'

const fixtures = fileURLToPath(new URL('./fixtures/tester/', import.meta.url))
const calls = plugin.rules.calls
const CALL = `import { run } from './run.js'\nrun()\n`

/** The title and the error of each case of a run, with the test framework replaced by a recorder. */
function record(cases: TestCases): { title: string; error?: string }[] {
  const results: { title: string; error?: string }[] = []
  const saved = { describe: RuleTester.describe, it: RuleTester.it, afterAll: RuleTester.afterAll }
  RuleTester.describe = (_name, fn) => fn()
  RuleTester.it = (title, fn) => {
    try {
      fn()
      results.push({ title })
    } catch (error) {
      if (!(error instanceof AssertionError)) throw error
      results.push({ title, error: error.message })
    }
  }
  RuleTester.afterAll = undefined
  try {
    createRuleTester({ fixtures }).run('test/calls', calls, cases)
  } finally {
    Object.assign(RuleTester, saved)
  }
  return results
}

describe('the rule tester', () => {
  it('fails a valid case that reports, and shows the report', () => {
    const [clean, reported] = record({ valid: ['export const a = 1', CALL], invalid: [] })
    expect(clean).toEqual({ title: 'export const a = 1' })
    expect(reported.error).toBe('A valid case gave 1 reports:\n2:1 call {"name":"run"}: This calls `run`.')
  })

  it('fails an invalid case whose reports differ in number, message id, data, line or column', () => {
    const results = record({
      valid: [],
      invalid: [
        { name: 'right', code: CALL, errors: [{ messageId: 'call', data: { name: 'run' }, line: 2, column: 1 }] },
        { name: 'number', code: CALL, errors: [] },
        { name: 'message id', code: CALL, errors: [{ messageId: 'other' }] },
        { name: 'data', code: CALL, errors: [{ messageId: 'call', data: { name: 'walk' } }] },
        { name: 'line', code: CALL, errors: [{ messageId: 'call', line: 1 }] },
        { name: 'column', code: CALL, errors: [{ messageId: 'call', column: 2 }] },
      ],
    })
    expect(results).toEqual([
      { title: 'right' },
      { title: 'number', error: 'The rule gave 1 reports and the case expects 0:\n2:1 call {"name":"run"}: This calls `run`.' },
      { title: 'message id', error: 'Report 1 (2:1 call {"name":"run"}: This calls `run`.): message id call, expected other' },
      { title: 'data', error: 'Report 1 (2:1 call {"name":"run"}: This calls `run`.): data {"name":"run"}, expected {"name":"walk"}' },
      { title: 'line', error: 'Report 1 (2:1 call {"name":"run"}: This calls `run`.): line 2, expected 1' },
      { title: 'column', error: 'Report 1 (2:1 call {"name":"run"}: This calls `run`.): column 1, expected 2' },
    ])
  })

  it('serves each case as a new file, also under another name', () => {
    const results = record({
      valid: [{ code: 'export const b = 2', filename: 'other.ts' }],
      invalid: [{ code: `import { run } from './run.js'\n\nrun()\n`, errors: [{ messageId: 'call', line: 3 }] }],
    })
    expect(results.map(({ error }) => error)).toEqual([undefined, undefined])
  })
})

// A run in the test framework itself: each case is a test of vitest.
RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll
createRuleTester({ fixtures }).run('test/calls', calls, {
  valid: ['export const c = 3'],
  invalid: [{ code: CALL, errors: [{ messageId: 'call', data: { name: 'run' } }] }],
})
