import { packageEntryPoints } from '../package-entry-points.ts'
import { createRuleTester } from './rule-tester.ts'

const insidePackage = (name: string) => [{ messageId: 'insidePackage' as const, data: { package: name } }]
const climbsOut = (workspace: string) => [{ messageId: 'climbsOut' as const, data: { workspace } }]

/** A case has to sit somewhere: which workspace a file is in decides what its relative imports reach. */
const inUi = (code: string) => ({ filename: 'packages/ui/src/button.tsx', code })

createRuleTester().run('package-entry-points', packageEntryPoints, {
  valid: [
    // The subpaths a package declares, which is the whole of what it promises.
    `import { Button } from '@acme/ui/button'`,
    `import { createFetch } from '@acme/api-client/create-fetch'`,
    `import { useDisclosure } from '@acme/hooks/use-disclosure'`,
    `export { Button } from '@acme/ui/button'`,
    `const { Button } = await import('@acme/ui/button')`,
    // Inside a workspace, a relative path is how a module reaches its neighbour.
    inUi(`import { isPath } from './paths.ts'`),
    inUi(`import { json } from '../test/fake-fetch.ts'`),
    // The shared build and test configuration is no workspace, and a workspace
    // config reaches it relatively by design.
    { filename: 'packages/ui/vitest.config.ts', code: `import { reactTestProject } from '../../config/vitest.ts'` },
    { filename: 'apps/lumen/vite.config.ts', code: `export { sharedViteConfig as default } from '../../config/vite.ts'` },
    // A file outside every workspace has none to climb out of.
    { filename: 'vitest.config.ts', code: `import { x } from '../../elsewhere/y.ts'` },
    // Another package's own layout is not ours to judge.
    `import bits from 'some-library/src/internal.js'`,
    `import { z } from 'zod'`,
  ],
  invalid: [
    { code: `import { Button } from '@acme/ui/src/components/button.tsx'`, errors: insidePackage('@acme/ui') },
    { code: `import { useDisclosure } from '@acme/hooks/dist/index.js'`, errors: insidePackage('@acme/hooks') },
    { code: `export { ApiError } from '@acme/api-client/src/errors.ts'`, errors: insidePackage('@acme/api-client') },
    // A lazy import reaches just as far as a static one, and a specifier
    // written out in a template is the specifier.
    { code: `const mod = await import('@acme/ui/src/tokens.css')`, errors: insidePackage('@acme/ui') },
    { code: `const mod = await import(\`@acme/hooks/src/use-disclosure.ts\`)`, errors: insidePackage('@acme/hooks') },
    // Out of one workspace and into another, naming neither. How far `..` has
    // to climb depends on where the file sits, which is why the rule resolves
    // the path rather than counting the dots.
    { ...inUi(`import { useDisclosure } from '../../hooks/src/use-disclosure.ts'`), errors: climbsOut('packages/hooks') },
    {
      filename: 'packages/ui/src/components/button.tsx',
      code: `import { useDisclosure } from '../../../hooks/src/use-disclosure.ts'`,
      errors: climbsOut('packages/hooks'),
    },
    {
      filename: 'apps/lumen/src/feature.ts',
      code: `import { ApiError } from '../../../packages/api-client/src/errors.ts'`,
      errors: climbsOut('packages/api-client'),
    },
  ],
})
