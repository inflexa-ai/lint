import { typescript, vitest } from '@inflexa-ai/oxlint-plugin'

export default typescript({
  // A lint rule matches source text for a living, so the ban on a regular
  // expression is off for the source of the rules themselves.
  syntax: { regex: false },
  overrides: [
    {
      // The workspace tests with vitest, so its tests obey the vitest rules.
      files: ['**/*.test.{ts,tsx}', '**/vitest.config.ts'],
      ...vitest,
    },
  ],
})
