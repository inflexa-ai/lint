import { exportAtDeclaration } from '../export-at-declaration.ts'
import { createRuleTester } from './rule-tester.ts'

const list = (statement: string, first: string) => ({ messageId: 'exportList' as const, data: { statement, first } })
const reExport = (name: string, source: string) => ({ messageId: 'reExport' as const, data: { name, source } })

createRuleTester().run('export-at-declaration', exportAtDeclaration, {
  valid: [
    `export function NotFoundPage() {}`,
    `export const limit = 3`,
    `export type Props = { title: string }`,
    `export class Store {}`,
    `export default function Page() {}`,
    `export default { meta: {} }`,
    // A re-export names its source on the line.
    `export { z } from 'zod'`,
    `export type { Options } from './options.ts'`,
    `export * from './all.ts'`,
    // An empty list exports nothing and only marks the file as a module.
    `export {}`,
    // A namespace alias has no module to re-export from, so it gets no message.
    `import x = A.B\nexport { x }`,
  ],
  invalid: [
    {
      code: `function NotFoundPage() {}\n\nexport { NotFoundPage }`,
      output: `export function NotFoundPage() {}`,
      errors: [list('export { NotFoundPage }', 'NotFoundPage')],
    },
    {
      code: `function Button() {}\nconst buttonVariants = cva()\n\nexport { Button, buttonVariants }`,
      output: `export function Button() {}\nexport const buttonVariants = cva()`,
      errors: [list('export { Button, buttonVariants }', 'Button')],
    },
    {
      code: `type Props = { title: string }\nexport type { Props }`,
      output: `export type Props = { title: string }`,
      errors: [list('export type { Props }', 'Props')],
    },
    {
      code: `interface Legacy {}\nenum Tone { Calm }\nclass Store {}\nexport { Legacy, Tone, Store }`,
      output: `export interface Legacy {}\nexport enum Tone { Calm }\nexport class Store {}`,
      errors: [list('export { Legacy, Tone, Store }', 'Legacy')],
    },
    {
      // A value and a type of one name are both marked.
      code: `const OrgId = z.uuid()\ntype OrgId = z.output<typeof OrgId>\nexport { OrgId }`,
      output: `export const OrgId = z.uuid()\nexport type OrgId = z.output<typeof OrgId>`,
      errors: [list('export { OrgId }', 'OrgId')],
    },
    {
      // A rename has no declaration that says the same, so it is reported and left.
      code: `function page() {}\nexport { page as Page }`,
      output: null,
      errors: [list('export { page as Page }', 'page')],
    },
    {
      // Marking the statement would export the neighbour the list leaves out.
      code: `const a = 1, b = 2\nexport { a }`,
      output: null,
      errors: [list('export { a }', 'a')],
    },
    {
      code: `import { z } from 'zod'\nz.config({ jitless: true })\nexport { z }`,
      output: null,
      errors: [reExport('z', `'zod'`)],
    },
    {
      code: `import x = require('m')\n\nexport { x }`,
      errors: [reExport('x', `'m'`)],
    },
    {
      // A silent alias still holds the list back: the fixer cannot move its export.
      code: `import x = A.B\nconst y = 1\n\nexport { x, y }`,
      errors: [list('export { x, y }', 'y')],
    },
    {
      code: `import { type Options } from './options.ts'\nexport type { Options }`,
      output: null,
      errors: [reExport('Options', `'./options.ts'`)],
    },
    {
      // An imported and a declared name in one list: each gets its own report, and nothing is fixed.
      code: `import { z } from 'zod'\nconst limit = 3\nexport { z, limit }`,
      output: null,
      errors: [list('export { z, limit }', 'limit'), reExport('z', `'zod'`)],
    },
    {
      code: `function Page() {}\nexport default Page`,
      output: `export default function Page() {}`,
      errors: [{ messageId: 'defaultIdentifier' as const, data: { name: 'Page' } }],
    },
    {
      // `export default enum` is not a statement either.
      code: `enum Tone { Calm }\nexport default Tone`,
      output: null,
      errors: [{ messageId: 'defaultIdentifier' as const, data: { name: 'Tone' } }],
    },
    {
      // `export default const` is not a statement, so a constant is reported and left.
      code: `const Page = () => null\nexport default Page`,
      output: null,
      errors: [{ messageId: 'defaultIdentifier' as const, data: { name: 'Page' } }],
    },
  ],
})
