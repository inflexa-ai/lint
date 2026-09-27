import { createReactPrimitiveBan } from '../helpers/react-primitive-ban.ts'

// All three effect primitives, because banning only `useEffect` makes
// `useLayoutEffect` the obvious way around the rule.
export const noRawEffect = createReactPrimitiveBan({
  description: 'Keep raw effect primitives out of app code',
  names: ['useEffect', 'useLayoutEffect', 'useInsertionEffect'],
  guidance:
    'Compute derived values during render, react to a user action in its event handler, load data with TanStack Query, and reset state by changing a `key`. A reusable effect belongs in a named hook, in a file that the configuration of the repository exempts from this rule.',
  url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-raw-effect.md',
})
