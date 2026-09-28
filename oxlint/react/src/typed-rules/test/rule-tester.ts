import { fileURLToPath } from 'node:url'
import { createRuleTester as createTester, RuleTester } from '@inflexa-ai/typecheck/rule-tester'
import { afterAll, describe, it } from 'vitest'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url))

/** A tester whose cases are files of the fixture folder of the typed rules of this package. */
export function createRuleTester(): RuleTester {
  return createTester({ fixtures })
}
