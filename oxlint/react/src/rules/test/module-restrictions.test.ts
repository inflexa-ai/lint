import { noAppConcerns } from '../no-app-concerns.ts'
import { noDirectZustand } from '../no-direct-zustand.ts'
import { storePlacement } from '../store-placement.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

ruleTester.run('no-direct-zustand', noDirectZustand, {
  valid: [
    `import { createFeatureStore } from '@acme/hooks/create-feature-store'`,
    // A package that merely starts with the same letters is not zustand.
    `import { thing } from 'zustand-like'`,
    // A dynamic import of a computed specifier cannot be judged statically.
    `const lib = await import(name)`,
    `const part = await import(\`zustand/\${slice}\`)`,
    `export const local = 1`,
  ],
  invalid: [
    {
      code: `import { create } from 'zustand'`,
      options: [{ hint: 'The factory is createFeatureStore from @acme/hooks/create-feature-store.' }],
      errors: [{ messageId: 'direct' as const, data: { source: 'zustand', hint: ' The factory is createFeatureStore from @acme/hooks/create-feature-store.' } }],
    },
    { code: `import { create } from 'zustand'`, errors: [{ messageId: 'direct' as const, data: { source: 'zustand', hint: '' } }] },
    {
      code: `import { createStore } from 'zustand/vanilla'`,
      errors: [{ messageId: 'direct' as const, data: { source: 'zustand/vanilla', hint: '' } }],
    },
    { code: `import type { StateCreator } from 'zustand'`, errors: [{ messageId: 'direct' as const }] },
    { code: `export { create } from 'zustand'`, errors: [{ messageId: 'direct' as const }] },
    { code: `export * from 'zustand'`, errors: [{ messageId: 'direct' as const }] },
    { code: `const zustand = await import('zustand')`, errors: [{ messageId: 'direct' as const }] },
    // A specifier written out in a template names the module the string names,
    // and TypeScript and every bundler resolve it the same way.
    { code: `const zustand = await import(\`zustand\`)`, errors: [{ messageId: 'direct' as const, data: { source: 'zustand', hint: '' } }] },
  ],
})

// The module that exports the factory, which each repository names.
const factory: [{ factorySource: string }] = [{ factorySource: '@acme/hooks/create-feature-store' }]

ruleTester.run('store-placement', storePlacement, {
  valid: [
    {
      // Without the option there is no factory to recognize, thus the placement half is off.
      filename: 'apps/lumen/src/modules/files/file-explorer.tsx',
      code: `import { createFeatureStore } from '@acme/hooks/create-feature-store'`,
    },
    {
      filename: 'apps/lumen/src/modules/files/file-explorer.store.ts',
      code: `import { createFeatureStore } from '@acme/hooks/create-feature-store'`,
      options: factory,
    },
    {
      // Components consume the store's exports, not the factory.
      filename: 'apps/lumen/src/modules/files/file-explorer.tsx',
      code: `import { useFileExplorerStore } from './file-explorer.store.ts'`,
    },
    {
      filename: 'apps/lumen/src/modules/files/api/queries.ts',
      code: `import { useQuery } from '@tanstack/react-query'`,
    },
  ],
  invalid: [
    {
      filename: 'apps/lumen/src/modules/files/file-explorer.tsx',
      code: `import { createFeatureStore } from '@acme/hooks/create-feature-store'`,
      options: factory,
      errors: [{ messageId: 'factoryOutsideStore' as const }],
    },
    {
      // `.store.tsx` is refused too: a store file that renders has stopped being a store.
      filename: 'apps/lumen/src/modules/files/file-explorer.store.tsx',
      code: `import { createFeatureStore } from '@acme/hooks/create-feature-store'`,
      options: factory,
      errors: [{ messageId: 'factoryOutsideStore' as const }],
    },
    {
      filename: 'apps/lumen/src/modules/files/file-explorer.store.ts',
      code: `import { useQueryClient } from '@tanstack/react-query'`,
      errors: [{ messageId: 'serverDataInStore' as const, data: { source: '@tanstack/react-query' } }],
    },
    {
      filename: 'apps/lumen/src/modules/files/file-explorer.store.ts',
      code: `import { api } from '@/lib/api'`,
      options: [{ bannedInStores: ['^@/lib/api$'] }],
      errors: [{ messageId: 'serverDataInStore' as const, data: { source: '@/lib/api' } }],
    },
    {
      filename: 'apps/lumen/src/modules/files/file-explorer.tsx',
      code: `const factory = await import(\`@acme/hooks/create-feature-store\`)`,
      options: factory,
      errors: [{ messageId: 'factoryOutsideStore' as const }],
    },
  ],
})

ruleTester.run('no-app-concerns', noAppConcerns, {
  valid: [
    `import { useMountEffect } from '@acme/hooks/use-mount-effect'`,
    `import { clsx } from 'clsx'`,
    // Table and virtual are presentational libraries; only query and router are app concerns.
    `import { useReactTable } from '@tanstack/react-table'`,
    // A shared component reads its text through the one door, from the instance
    // of whichever app renders it.
    `import { useTranslation } from '@acme/i18n/react'`,
  ],
  invalid: [
    { code: `import { useQuery } from '@tanstack/react-query'`, errors: [{ messageId: 'concern' as const }] },
    { code: `import { Link } from '@tanstack/react-router'`, errors: [{ messageId: 'concern' as const }] },
    { code: `const router = await import('@tanstack/react-router')`, errors: [{ messageId: 'concern' as const }] },
    { code: `const query = await import(\`@tanstack/react-query\`)`, errors: [{ messageId: 'concern' as const }] },
    {
      code: `import { routes } from '@acme/lumen/routes'`,
      options: [{ also: [{ pattern: '^@acme/(lumen|flamme)(/|$)', reason: 'Packages must not import application code.' }] }],
      errors: [
        {
          messageId: 'concern' as const,
          data: { source: '@acme/lumen/routes', reason: 'Packages must not import application code.' },
        },
      ],
    },
  ],
})
