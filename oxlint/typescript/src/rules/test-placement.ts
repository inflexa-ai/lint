import type { TSESLint } from '@typescript-eslint/utils'
import path from 'node:path'

/** The options of the rule, once ESLint has merged `meta.defaultOptions` into them. */
type Options = { testFilePattern: string; testFolder: string }

const DEFAULTS: Options = { testFilePattern: '\\.test\\.[jt]sx?$', testFolder: 'test' }

/**
 * A directory should list the modules someone came looking for, not each module
 * followed by its test. Gathering the tests of one directory into a `test/`
 * folder inside it keeps that listing readable while a test stays next to the
 * code it describes, one level away.
 *
 * Only placement is checked. Whether a subject file exists is left alone: a
 * test whose subject moved or went away fails on its own, and a rule that
 * guessed the subject from the filename would fight every test that covers a
 * folder, a build step or the test setup rather than one module.
 */
export const testPlacement: TSESLint.RuleModule<'outsideTestFolder', [Partial<Options>]> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep a test in a test/ folder beside the code it tests',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/test-placement.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          testFilePattern: { type: 'string' },
          testFolder: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [DEFAULTS],
    messages: {
      outsideTestFolder:
        'A test belongs in a `{{folder}}/` folder beside the code it tests, so a directory lists its modules and not its modules interleaved with their tests. Move this file to `{{expected}}`. If this one test genuinely has to stay where it is, keep it here with an inline `/* oxlint-disable @inflexa-ai/test-placement -- <why this file is the exception> */`.',
    },
  },
  create(context) {
    const { testFilePattern, testFolder } = { ...DEFAULTS, ...context.options[0] }
    const { filename } = context

    if (!new RegExp(testFilePattern).test(filename)) return {}
    // The immediate parent, so a test cannot drift into a subtree of test/.
    if (path.basename(path.dirname(filename)) === testFolder) return {}

    const expected = path.join(path.dirname(filename), testFolder, path.basename(filename))

    return {
      Program() {
        context.report({
          // The file's location is the violation, so no part of its contents is
          // more to blame than any other.
          loc: { line: 1, column: 0 },
          messageId: 'outsideTestFolder',
          data: {
            folder: testFolder,
            // Written the way a reader would type it, rather than the absolute
            // path ESLint has already printed above the message.
            expected: path.relative(context.cwd, path.resolve(context.cwd, expected)),
          },
        })
      },
    }
  },
}
