import { createPrimitiveBan } from '@inflexa-ai/oxlint-plugin/helpers/primitive-ban'

// `useContext` is banned with `createContext` because the factory hands back
// its own consumer function; app code that reaches for `useContext` holds a
// raw context object that no factory made.
export const noRawContext = createPrimitiveBan({
  description: 'Create app contexts only through a context factory',
  module: 'solid-js',
  names: ['createContext', 'useContext'],
  guidance:
    'A context factory of the repository owns each context: it makes the provider and the one consumer function, which states what happens with no provider above it. A raw `useContext` gives `undefined` there, and each call site decides again.',
  url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/solid-no-raw-context.md',
})
