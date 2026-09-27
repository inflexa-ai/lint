import { noEmptySchema } from '../no-empty-schema.ts'
import { createRuleTester } from './rule-tester.ts'

const empty = (builder: string) => [{ messageId: 'emptySchema' as const, data: { builder } }]

createRuleTester().run('no-empty-schema', noEmptySchema, {
  valid: [
    `const Project = z.object({ id: z.string() })`,
    `const Ids = z.array(z.string())`,
    `const Either = z.union([z.string(), z.number()])`,
    // A custom schema carrying the check that decides it: the form the client
    // uses to tell a FormData from a body built in another realm.
    `const FormDataBody = z.custom<FormData>((value) => tagOf(value) === '[object FormData]')`,
    `const Loose = z.custom<Widget>(isWidget)`,
    // Another object's method of the same name.
    `const value = schema.any()`,
    `const parsed = z.object({ id: z.string() }).parse(input)`,
    // A `z` this file bound to something else is not the zod namespace.
    `import { z } from './coordinates.ts'\nconst depth = z.any()`,
    // The module hands out `z` alone, so another of its exports is not it.
    `import { core } from '@acme/zod.ts'\nconst loose = core.any()`,
  ],
  invalid: [
    { code: `const Anything = z.any()`, errors: empty('any') },
    { code: `const Whatever = z.unknown()`, errors: empty('unknown') },
    { code: `const Claimed = z.custom<Project>()`, errors: empty('custom') },
    // Where it does the most damage: the schema an untrusted client demands.
    { code: `await pubchem.get('/compounds/aspirin', { schema: z.any() })`, errors: empty('any') },
    { code: `const Row = z.object({ payload: z.any() })`, errors: empty('any') },
    // The namespace under another local name, and the namespace reached through
    // the module: the same builder, recognised by the import it came from.
    { code: `import { z } from '@acme/zod.ts'\nconst Anything = z['any']()`, errors: empty('any') },
    { code: `import { z as schema } from '@acme/zod.ts'\nconst Anything = schema.any()`, errors: empty('any') },
    { code: `import * as zod from '@acme/zod.ts'\nconst Whatever = zod.z.unknown()`, errors: empty('unknown') },
    // The relative door, which is how `extensions/` reaches its own zod.
    { code: `import { z } from '../zod.ts'\nconst Claimed = z.custom<Project>()`, errors: empty('custom') },
  ],
})
