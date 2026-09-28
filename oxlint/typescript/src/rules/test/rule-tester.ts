import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'

// The RuleTester looks for mocha-style globals, and Vitest runs without globals here.
RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/**
 * A RuleTester of oxlint, the linter that runs each rule of these plugins. It
 * parses the same TypeScript and JSX that the real config lints.
 *
 * `eslintCompat` keeps the ESLint meaning of a column, which counts from 1, as
 * the cases of this repository read.
 */
export function createRuleTester({ globals }: { globals?: Record<string, boolean> } = {}): RuleTester {
  return new RuleTester({ eslintCompat: true, languageOptions: { globals, parserOptions: { lang: 'tsx' } } })
}
