import { createReactPrimitiveBan } from '../helpers/react-primitive-ban.ts'

export const noRawState = createReactPrimitiveBan({
  description: 'Give every piece of app state a designated home instead of raw component state',
  names: ['useState', 'useReducer'],
  guidance:
    "In app code each kind of state has one home: server data in TanStack Query; shareable view state (filters, tabs, selection, pagination) in route search params; form fields in a form library; state shared across one feature's components in a store scoped to that feature; an open/close flag in an uncontrolled primitive or a disclosure hook. State owned by a reusable component belongs with that component in its shared package.",
  url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-raw-state.md',
})
