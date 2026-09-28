import { noRawContext } from '../no-raw-context.ts'
import { noRawEffect } from '../no-raw-effect.ts'
import { noRawState } from '../no-raw-state.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

const banned = (name: string) => ({ messageId: 'banned' as const, data: { name, hint: '' } })

ruleTester.run('no-raw-effect', noRawEffect, {
  valid: [
    `import { useMemo, useRef } from 'react'`,
    `import { useMountEffect } from '@acme/hooks/use-mount-effect'`,
    // Same name, different module: only react's primitives are the concern.
    `import { useEffect } from 'preact/hooks'`,
    `import type { useEffect } from 'react'`,
    `import type React from 'react'; React.useEffect(() => {}, [])`,
    `const timers = { useEffect() {} }; timers.useEffect()`,
    `import React from 'react'; React.useMemo(() => 1, [])`,
    // A computed name cannot be judged statically; the named forms are what the rule closes.
    `import React from 'react'; const hook = React[name]`,
    // Only destructuring the react import counts, and only its plain properties.
    `import React from 'react'; const { useEffect } = other`,
    `import React from 'react'; const { [key]: picked, ...rest } = React`,
  ],
  invalid: [
    {
      // The repository names its own replacement, and the message ends with it.
      code: `import { useEffect } from 'react'`,
      options: [{ hint: 'Use useMountEffect from @acme/hooks/use-mount-effect.' }],
      errors: [{ messageId: 'banned' as const, data: { name: 'useEffect', hint: ' Use useMountEffect from @acme/hooks/use-mount-effect.' } }],
    },
    { code: `import { useEffect } from 'react'`, errors: [banned('useEffect')] },
    { code: `import { useLayoutEffect as layout } from 'react'`, errors: [banned('useLayoutEffect')] },
    { code: `import { useMemo, useInsertionEffect } from 'react'`, errors: [banned('useInsertionEffect')] },
    { code: `import React from 'react'; React.useEffect(() => {}, [])`, errors: [banned('useEffect')] },
    { code: `import * as R from 'react'; R['useLayoutEffect'](() => {})`, errors: [banned('useLayoutEffect')] },
    // The namespace import can sit below its use; hoisting makes that legal.
    { code: `React.useEffect(() => {}); import React from 'react'`, errors: [banned('useEffect')] },
    { code: `import React from 'react'; const { useEffect } = React`, errors: [banned('useEffect')] },
    { code: `import React from 'react'; const { useEffect: run } = React`, errors: [banned('useEffect')] },
    { code: `export { useEffect } from 'react'`, errors: [banned('useEffect')] },
    { code: `export { useEffect as useSync } from 'react'`, errors: [banned('useEffect')] },
    { code: `export * from 'react'`, errors: [{ messageId: 'reexportAll' as const }] },
    {
      code: `import { useEffect, useMemo } from 'react'`,
      errors: [
        {
          message:
            '`useEffect` from react is not available here. Compute derived values during render, react to a user action in its event handler, load data with TanStack Query, and reset state by changing a `key`. A reusable effect belongs in a named hook, in a file that the configuration of the repository exempts from this rule.',
        },
      ],
    },
    {
      code: `export * from 'react'\nexport * from './hooks.ts'`,
      errors: [{ message: 'Re-exporting everything from react hands out the primitives this rule bans. Export the specific names instead.' }],
    },
  ],
})

ruleTester.run('no-raw-state', noRawState, {
  valid: [`import { useId, useTransition } from 'react'`, `import { useDisclosure } from '@acme/hooks/use-disclosure'`],
  invalid: [
    { code: `import { useState } from 'react'`, errors: [banned('useState')] },
    { code: `import { useReducer } from 'react'`, errors: [banned('useReducer')] },
    { code: `import React from 'react'; const [open] = React.useState(false)`, errors: [banned('useState')] },
    {
      // The list is replaceable so a zone can tighten the rule without forking it.
      code: `import { useState, useOptimistic } from 'react'`,
      options: [{ names: ['useOptimistic'] }],
      errors: [banned('useOptimistic')],
    },
    {
      code: `import { useId, useState } from 'react'`,
      errors: [
        {
          message:
            "`useState` from react is not available here. In app code each kind of state has one home: server data in TanStack Query; shareable view state (filters, tabs, selection, pagination) in route search params; form fields in a form library; state shared across one feature's components in a store scoped to that feature; an open/close flag in an uncontrolled primitive or a disclosure hook. State owned by a reusable component belongs with that component in its shared package.",
        },
      ],
    },
  ],
})

ruleTester.run('no-raw-context', noRawContext, {
  valid: [`import { createSettledContext } from '@acme/hooks/create-settled-context'`, `import { use } from 'react'`],
  invalid: [
    { code: `import { createContext } from 'react'`, errors: [banned('createContext')] },
    { code: `import { useContext } from 'react'`, errors: [banned('useContext')] },
    {
      code: `import { createContext, useContext } from 'react'`,
      errors: [banned('createContext'), banned('useContext')],
    },
    {
      code: `import { useContext } from 'react'`,
      options: [{ hint: 'Use createSettledContext from @acme/hooks/create-settled-context.' }],
      errors: [
        {
          message:
            '`useContext` from react is not available here. Context re-renders every consumer when its value changes, so app code may only use it for a value that is settled before its subtree renders and keeps one identity while mounted, through a context factory of the repository. State that changes belongs in a store. Use createSettledContext from @acme/hooks/create-settled-context.',
        },
      ],
    },
  ],
})
