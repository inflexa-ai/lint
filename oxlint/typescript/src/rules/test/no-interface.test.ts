import { noInterface } from '../no-interface.ts'
import { createRuleTester } from './rule-tester.ts'

const reported = (line: number) => ({ messageId: 'interfaceDeclaration' as const, line })

createRuleTester().run('no-interface', noInterface, {
  valid: [
    `type Props = { label: string; onSelect: (id: string) => void }`,
    `type Result = { ok: true } | { ok: false; error: string }`,
    // Handing the router's type to the library is declaration merging, which is
    // the one job `interface` has that `type` cannot do.
    `declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}`,
    `declare global {
  interface Window {
    __app: { version: string }
  }
}`,
    // Whatever an augmentation nests is merging along with it.
    `declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_API_URL: string
    }
  }
}`,
    `declare module 'vite' {
  interface UserConfig {
    acme?: boolean
  }
  interface ServerOptions {
    acme?: boolean
  }
}`,
  ],
  invalid: [
    { code: `interface Props { label: string }`, errors: [reported(1)] },
    { code: `export interface Props { label: string }`, errors: [reported(1)] },
    { code: `export default interface Props { label: string }`, errors: [reported(1)] },
    { code: `interface Box<T> { value: T }`, errors: [reported(1)] },
    { code: `interface ButtonProps extends BaseProps { tone: Tone }`, errors: [reported(1)] },
    { code: `interface Props extends BaseProps, AriaProps { tone: Tone }`, errors: [reported(1)] },
    { code: `interface Empty {}`, errors: [reported(1)] },
    { code: `function render() { interface Local { id: string } return null }`, errors: [reported(1)] },
    {
      // A namespace merges nothing from outside the file, declared or not, so
      // neither form is a home for an interface.
      code: `namespace Options {
  interface Props { label: string }
}`,
      errors: [reported(2)],
    },
    {
      code: `declare namespace Options {
  interface Props { label: string }
}`,
      errors: [reported(2)],
    },
    {
      // `declare module Options` is that same namespace under the other keyword:
      // an augmented module is named by a string.
      code: `declare module Options {
  interface Props { label: string }
}`,
      errors: [reported(2)],
    },
    {
      // Merging into a global type is written inside `declare global`; the bare
      // declaration in a module only declares a local shape with a famous name.
      code: `interface Window {
  __app: { version: string }
}
export {}`,
      errors: [reported(1)],
    },
    {
      // One report, on the declaration that is outside the augmentation.
      code: `declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

interface Props {
  label: string
}`,
      errors: [reported(7)],
    },
  ],
})
