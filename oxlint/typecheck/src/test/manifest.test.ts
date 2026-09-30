import { expect, test } from 'vitest'
import manifest from '../../package.json' with { type: 'json' }

test('the package takes TypeScript 7 as the exact alias dependency and declares no `typescript` peer', () => {
  expect(manifest.dependencies).toHaveProperty('@typescript/native', 'npm:typescript@7.0.2')
  expect(Object.keys(manifest.dependencies)).toEqual(['@typescript/native'])
  expect('peerDependencies' in manifest).toBe(false)
})
