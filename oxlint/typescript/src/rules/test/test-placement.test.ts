import { testPlacement } from '../test-placement.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

// oxlint hands a rule an absolute path under its working directory. The
// RuleTester of oxlint makes the folder of an absolute file name the working
// directory, thus the cases name a path relative to the working directory,
// which the tester joins to its own and the rule resolves the same way.

const code = `export const nothing = 1`

ruleTester.run('test-placement', testPlacement, {
  valid: [
    { filename: 'packages/hooks/src/test/use-disclosure.test.tsx', code },
    { filename: 'packages/ui/src/components/test/button.test.tsx', code },
    { filename: 'config/eslint/rules/test/no-raw-network.test.js', code },
    // The code under test, and a helper the tests import, are not tests.
    { filename: 'packages/hooks/src/use-disclosure.ts', code },
    { filename: 'config/eslint/rules/test/rule-tester.js', code },
    // `.test.` is the whole pattern: a name that merely contains the word is not one.
    { filename: 'apps/lumen/src/test-helpers.ts', code },
    {
      filename: 'packages/ui/src/components/spec/button.test.tsx',
      options: [{ testFolder: 'spec' }],
      code,
    },
  ],
  invalid: [
    {
      filename: 'packages/hooks/src/use-disclosure.test.tsx',
      code,
      errors: [
        {
          messageId: 'outsideTestFolder' as const,
          data: { folder: 'test', expected: 'packages/hooks/src/test/use-disclosure.test.tsx' },
          // Reported at the top of the file, whatever the file contains.
          line: 1,
          column: 1,
        },
      ],
    },
    {
      filename: 'config/eslint/rules/no-raw-network.test.js',
      code,
      errors: [
        {
          messageId: 'outsideTestFolder' as const,
          data: { folder: 'test', expected: 'config/eslint/rules/test/no-raw-network.test.js' },
        },
      ],
    },
    {
      // Only the immediate parent counts, so a test cannot drift down a subtree.
      filename: 'packages/hooks/src/test/nested/use-disclosure.test.tsx',
      code,
      errors: [
        {
          messageId: 'outsideTestFolder' as const,
          data: { folder: 'test', expected: 'packages/hooks/src/test/nested/test/use-disclosure.test.tsx' },
        },
      ],
    },
    {
      // Both the pattern and the folder are replaceable, so a workspace with
      // another naming convention can adopt the rule without forking it.
      filename: 'packages/ui/src/components/button.spec.tsx',
      options: [{ testFilePattern: '\\.spec\\.tsx?$', testFolder: 'spec' }],
      code,
      errors: [
        {
          messageId: 'outsideTestFolder' as const,
          data: { folder: 'spec', expected: 'packages/ui/src/components/spec/button.spec.tsx' },
        },
      ],
    },
  ],
})
