import { createReactPrimitiveBan } from '../helpers/react-primitive-ban.ts'

// `useContext` is banned with `createContext` because the factories hand back
// their own consumer hook; app code reaching for `useContext` means it got a
// raw context object from somewhere it should not have.
export const noRawContext = createReactPrimitiveBan({
  description: 'Create app contexts only through the settled-context and feature-store factories',
  names: ['createContext', 'useContext'],
  guidance:
    'Context re-renders every consumer when its value changes, so app code may only use it for a value that is settled before its subtree renders and keeps one identity while mounted, through the settled-context factory. State that changes belongs in a feature store.',
  url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-raw-context.md',
})
