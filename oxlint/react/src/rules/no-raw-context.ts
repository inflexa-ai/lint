import { createPrimitiveBan } from '@inflexa-ai/oxlint-plugin/helpers/primitive-ban'

// `useContext` is banned with `createContext` because the factories hand back
// their own consumer hook; app code reaching for `useContext` means it got a
// raw context object from somewhere it should not have.
export const noRawContext = createPrimitiveBan({
  description: 'Create app contexts only through a context factory',
  module: 'react',
  names: ['createContext', 'useContext'],
  guidance:
    'Context re-renders every consumer when its value changes, so app code may only use it for a value that is settled before its subtree renders and keeps one identity while mounted, through a context factory of the repository. State that changes belongs in a store.',
  url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-raw-context.md',
})
