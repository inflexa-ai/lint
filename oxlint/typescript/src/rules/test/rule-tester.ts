import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RuleTester as TypedRuleTester, type RunTests } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'
import { RuleTester } from 'oxlint/plugins-dev'
import { afterAll, describe, it } from 'vitest'

// Each RuleTester looks for mocha-style globals, and Vitest runs without globals
// here. `afterAll` releases the TypeScript project service after a typed run.
TypedRuleTester.afterAll = afterAll
TypedRuleTester.describe = describe
TypedRuleTester.it = it
TypedRuleTester.itOnly = it.only
RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

/** A tester whose cases the compiler checks against the options and the message ids of the rule. */
export type SyntaxRuleTester = {
  run<MessageIds extends string, Options extends readonly unknown[]>(name: string, rule: TSESLint.RuleModule<MessageIds, Options>, tests: RunTests<MessageIds, Options>): void
}

/**
 * A RuleTester of oxlint, the linter that runs each rule that reads only
 * syntax. It parses the same TypeScript and JSX that the real config lints.
 *
 * The cases keep the types of typescript-eslint, and `eslintCompat` keeps the
 * ESLint meaning of a column, which counts from 1, so that a case reads the
 * same in this tester and in the typed tester below.
 */
export function createRuleTester({ globals }: { globals?: Record<string, boolean> } = {}): SyntaxRuleTester {
  const tester = new RuleTester({ eslintCompat: true, languageOptions: { globals, parserOptions: { lang: 'tsx' } } })
  return {
    run(name, rule, tests) {
      // SAFETY: the same bridge as the one in plugin.ts. oxlint types a rule
      // with its own context, and typescript-eslint with its own, thus the
      // compiler relates neither type to the other. oxlint runs the rule module
      // as it is, and hands `create()` an AST of the TSESTree shape.
      const oxlintRule = rule as unknown as Parameters<RuleTester['run']>[1]
      // SAFETY: the cases of the two testers differ only where no case of this
      // repository goes: an `output` that lists each pass of a fix, and options
      // that are not JSON. oxlint reads the cases and changes none of them.
      const oxlintTests = tests as unknown as Parameters<RuleTester['run']>[2]
      tester.run(name, oxlintRule, oxlintTests)
    },
  }
}

const fixtureDir = fileURLToPath(new URL('./fixtures/', import.meta.url))

/**
 * A file name inside the fixture folder. A case has to be named as one of its
 * files for the parser to place it in that project and hand the rule a program.
 */
export function fixtureFile(name: string, dir = fixtureDir): string {
  return path.join(dir, name)
}

/**
 * A RuleTester of typescript-eslint whose parser carries a program, for a rule
 * that asks the type checker a question. oxlint gives a JS plugin no program,
 * thus ESLint runs these rules and this tester stays on ESLint.
 *
 * The tsconfig of a fixture folder lists the modules that a case imports, so a
 * case file belongs to no project and `allowDefaultProject` is what gives it
 * one. Listing both would be refused: the parser rejects a file that is in a
 * project and in `allowDefaultProject` at once.
 */
export function createTypedRuleTester(dir = fixtureDir): TypedRuleTester {
  return new TypedRuleTester({
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.ts'] },
        tsconfigRootDir: dir,
      },
    },
  })
}
