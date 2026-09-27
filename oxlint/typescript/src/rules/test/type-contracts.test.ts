import { noUnknownParameters } from '../no-unknown-parameters.ts'
import { noUnknownReturns } from '../no-unknown-returns.ts'
import { noUnknownTypeAliases } from '../no-unknown-type-aliases.ts'
import { noUnsafeDictionary } from '../no-unsafe-dictionary.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

const unknownParameter = (name: string) => ({ messageId: 'unknownParameter' as const, data: { name } })

ruleTester.run('no-unknown-parameters', noUnknownParameters, {
  valid: [
    `function save(user: User) {}`,
    `const read = (id: OrgId) => load(id)`,
    // An error cause is unknown by contract.
    `function wrap(cause: unknown) {}`,
    `class E extends Error { constructor(cause: unknown) { super() } }`,
    // A generic parameter is not unknown.
    `function first<T>(value: T): T { return value }`,
    `function save(user: User, meta: RequestMeta) {}`,
  ],
  invalid: [
    { code: `function save(value: unknown) {}`, errors: [unknownParameter('value')] },
    { code: `const read = (value: unknown) => 1`, errors: [unknownParameter('value')] },
    { code: `function save(user: User, value: unknown) {}`, errors: [unknownParameter('value')] },
    // A rest and a default carry the annotation too.
    { code: `function save(...values: unknown) {}`, errors: [unknownParameter('values')] },
    { code: `function save(value: unknown = 1) {}`, errors: [unknownParameter('value')] },
    // A method signature in a type is a contract as much as a function is.
    { code: `type Store = { put(value: unknown): void }`, errors: [unknownParameter('value')] },
  ],
})

const unknownReturn = { messageId: 'unknownReturn' as const }

ruleTester.run('no-unknown-returns', noUnknownReturns, {
  valid: [
    `function load(): User { return user }`,
    `const load = (): Promise<User> => fetchUser()`,
    // A generic return is not unknown, even where a caller later picks unknown for it.
    `function first<T>(value: T): T { return value }`,
    // A type parameter shadows a module alias of the same name.
    `type Raw = unknown\nfunction pass<Raw>(value: Raw): Raw { return value }`,
    `function tag(): string { return '' }`,
  ],
  invalid: [
    { code: `function load(): unknown { return 1 }`, errors: [unknownReturn] },
    { code: `const load = (): unknown => 1`, errors: [unknownReturn] },
    { code: `function load(): Promise<unknown> { return Promise.resolve(1) }`, errors: [unknownReturn] },
    { code: `async function load(): Promise<unknown> { return 1 }`, errors: [unknownReturn] },
    // An alias of this file that resolves to unknown is unknown.
    { code: `type Raw = unknown\nfunction load(): Raw { return raw }`, errors: [unknownReturn] },
    // A union that includes unknown collapses to it.
    { code: `function load(): User | unknown { return user }`, errors: [unknownReturn] },
    { code: `type Store = { read(): unknown }`, errors: [unknownReturn] },
  ],
})

const unknownAlias = (name: string) => ({ messageId: 'unknownAlias' as const, data: { name } })

ruleTester.run('no-unknown-type-aliases', noUnknownTypeAliases, {
  valid: [
    `type User = { id: string }`,
    `type Id = string`,
    `type Maybe = string | number`,
    // A generic guard type carries unknown in its parameter, not as its whole self.
    `type Guard<T> = (value: unknown) => value is T`,
  ],
  invalid: [
    { code: `type Payload = unknown`, errors: [unknownAlias('Payload')] },
    { code: `type Payload = (unknown)`, errors: [unknownAlias('Payload')] },
    { code: `type Loose = string | unknown`, errors: [unknownAlias('Loose')] },
    // A second hop does not launder the top type.
    { code: `type A = unknown\ntype B = A`, errors: [unknownAlias('A'), unknownAlias('B')] },
  ],
})

const unsafeDictionary = (value: string) => ({ messageId: 'unsafeDictionary' as const, data: { value } })

ruleTester.run('no-unsafe-dictionary', noUnsafeDictionary, {
  valid: [
    `type Users = Record<string, User>`,
    `type Counts = { [name: string]: number }`,
    // A shadowed Record is not the builtin.
    `import { Record } from './schema'\ntype Users = Record<string, unknown>`,
    // A Map is not an index dictionary.
    `type Cache = Map<string, unknown>`,
    `type Flags = Record<string, boolean>`,
  ],
  invalid: [
    { code: `type Bag = Record<string, unknown>`, errors: [unsafeDictionary('unknown')] },
    { code: `type Bag = Record<string, any>`, errors: [unsafeDictionary('any')] },
    { code: `type Bag = { [key: string]: unknown }`, errors: [unsafeDictionary('unknown')] },
    { code: `type Bag = { [key: string]: object }`, errors: [unsafeDictionary('object')] },
    { code: `type Bag = { [key: string]: {} }`, errors: [unsafeDictionary('empty object')] },
    { code: `type Bag = Record<string, string | unknown>`, errors: [unsafeDictionary('union')] },
    { code: `type Bag = { [key: string]: any }`, errors: [unsafeDictionary('any')] },
    // The value is followed through readonly, an alias and an empty interface.
    { code: `type Raw = unknown\ntype Bag = Record<string, Raw>`, errors: [unsafeDictionary('unknown')] },
    { code: `interface Empty {}\ntype Bag = Record<string, Empty>`, errors: [unsafeDictionary('empty object')] },
    // Readonly wraps the same dictionary underneath.
    { code: `type Bag = Readonly<Record<string, unknown>>`, errors: [unsafeDictionary('unknown')] },
    // A mapped type over a broad value is a dictionary too.
    { code: `type Bag = { [K in string]: any }`, errors: [unsafeDictionary('any')] },
  ],
})
