import { typescript, vitest } from '@inflexa-ai/oxlint-plugin'

export default typescript({
  // A lint rule matches source text for a living, so the ban on a regular
  // expression is off for the source of the rules themselves.
  syntax: { regex: false },
  overrides: [
    {
      // The plugin objects and the rule tester bridge the TSESTree rule universe
      // of typescript-eslint to the rule types of ESLint and of oxlint, and the
      // compiler relates none of them, so the SAFETY cast in each needs the
      // `unknown` hop. These files are the whole of the bridge.
      files: ['typescript/src/plugin.ts', 'react/src/plugin.ts', 'typescript/src/rules/test/rule-tester.ts'],
      rules: {
        '@inflexa-ai/no-double-cast': 'off',
        'typescript/no-unsafe-type-assertion': 'off',
      },
    },
    {
      // The workspace tests with vitest, so its tests obey the vitest rules.
      files: ['**/*.test.{ts,tsx}', '**/vitest.config.ts'],
      ...vitest,
    },
  ],
})
