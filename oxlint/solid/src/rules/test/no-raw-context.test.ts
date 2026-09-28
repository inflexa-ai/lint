import { noRawContext } from '../no-raw-context.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

const banned = (name: string) => ({ messageId: 'banned' as const, data: { name, hint: '' } })

const guidance =
  'A context factory of the repository owns each context: it makes the provider and the one consumer function, which states what happens with no provider above it. A raw `useContext` gives `undefined` there, and each call site decides again.'

ruleTester.run('no-raw-context', noRawContext, {
  valid: [
    `import { createSignal, onCleanup } from 'solid-js'`,
    `import { createStrictContext } from '@acme/context'`,
    // Same names, different module: only the primitives of solid-js are the concern.
    `import { createContext, useContext } from 'react'`,
    `import type { createContext } from 'solid-js'`,
    `import { type useContext } from 'solid-js'`,
    `export type { useContext } from 'solid-js'`,
    `export type * from 'solid-js'`,
    // A dynamic import hands the module out at runtime, which the rule does not follow.
    `const Solid = await import('solid-js'); Solid.useContext(context)`,
    `import * as Solid from 'solid-js'; Solid.createSignal(0)`,
    `import * as Solid from 'solid-js'; const { useContext } = other`,
    `export { type useContext } from 'solid-js'`,
    `import type * as Solid from 'solid-js'; type Read = typeof Solid.useContext`,
    `import type * as Solid from 'solid-js'; const { useContext } = Solid`,
    `import * as Solid from 'solid-js'; const { [key]: picked, ...rest } = Solid`,
    // A local binding that shadows the namespace import is a different value.
    `import * as Solid from 'solid-js'; function read(Solid) { return Solid.useContext(context) }`,
    `import * as Solid from 'solid-js'; function read(Solid) { const { createContext } = Solid; return createContext }`,
  ],
  invalid: [
    { code: `import { createContext } from 'solid-js'`, errors: [banned('createContext')] },
    { code: `import { useContext } from 'solid-js'`, errors: [banned('useContext')] },
    { code: `import { createContext as make } from 'solid-js'`, errors: [banned('createContext')] },
    { code: `import { createSignal, useContext as read } from 'solid-js'`, errors: [banned('useContext')] },
    { code: `export { useContext } from 'solid-js'`, errors: [banned('useContext')] },
    { code: `export { createContext as makeContext } from 'solid-js'`, errors: [banned('createContext')] },
    { code: `import * as Solid from 'solid-js'; Solid.useContext(context)`, errors: [banned('useContext')] },
    { code: `import * as Solid from 'solid-js'; Solid['createContext']()`, errors: [banned('createContext')] },
    // The namespace import can sit below its use; hoisting makes that legal.
    { code: `Solid.useContext(context); import * as Solid from 'solid-js'`, errors: [banned('useContext')] },
    { code: `import * as Solid from 'solid-js'; const { createContext } = Solid`, errors: [banned('createContext')] },
    { code: `import * as Solid from 'solid-js'; const { useContext: read } = Solid`, errors: [banned('useContext')] },
    { code: `import * as Solid from 'solid-js'; const { ['useContext']: read } = Solid`, errors: [banned('useContext')] },
    { code: `export * from 'solid-js'`, errors: [{ messageId: 'reexportAll' as const }] },
    {
      // The list is replaceable so a zone can tighten the rule without forking it.
      code: `import { createContext, createSignal } from 'solid-js'`,
      options: [{ names: ['createSignal'] }],
      errors: [banned('createSignal')],
    },
    {
      code: `import { createContext, useContext } from 'solid-js'`,
      errors: [{ message: `\`createContext\` from solid-js is not available here. ${guidance}` }, { message: `\`useContext\` from solid-js is not available here. ${guidance}` }],
    },
    {
      // The repository names its own replacement, and the message ends with it.
      code: `import { useContext } from 'solid-js'`,
      options: [{ hint: 'Use createStrictContext from @acme/context.' }],
      errors: [{ message: `\`useContext\` from solid-js is not available here. ${guidance} Use createStrictContext from @acme/context.` }],
    },
    {
      code: `export * from 'solid-js'\nexport * from './context.ts'`,
      errors: [{ message: 'Re-exporting everything from solid-js hands out the primitives this rule bans. Export the specific names instead.' }],
    },
  ],
})
