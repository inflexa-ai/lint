import { fileURLToPath } from 'node:url'
import type { RuleTester } from '@typescript-eslint/rule-tester'
import { createTypedRuleTester as createTypedRuleTesterIn, fixtureFile as fixtureFileIn } from '../../../../typescript/src/rules/test/rule-tester.ts'

export { createRuleTester } from '../../../../typescript/src/rules/test/rule-tester.ts'

const fixtureDir = fileURLToPath(new URL('./fixtures/', import.meta.url))

/** A typed RuleTester for the fixtures of this package. */
export function createTypedRuleTester(): RuleTester {
  return createTypedRuleTesterIn(fixtureDir)
}

/** A file name inside the fixture folder of this package. */
export function fixtureFile(name: string): string {
  return fixtureFileIn(name, fixtureDir)
}
