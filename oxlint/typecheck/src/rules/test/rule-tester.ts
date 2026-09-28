import { fileURLToPath } from 'node:url'
import { afterAll, describe, it } from 'vitest'
import { createRuleTester as createTester, RuleTester } from '../../rule-tester.ts'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url))

/** A tester whose cases are files of the fixture folder of the rules of this package. */
export function createRuleTester(): RuleTester {
  return createTester({ fixtures })
}
