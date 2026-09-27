import { expect, test } from 'vitest'
import manifest from '../../package.json' with { type: 'json' }

test('the manifest installs nothing for Tailwind and names the plugin as an optional peer', () => {
  expect(manifest.dependencies).not.toHaveProperty('eslint-plugin-better-tailwindcss')
  expect(manifest.peerDependencies).toHaveProperty('eslint-plugin-better-tailwindcss')
  expect(manifest.peerDependenciesMeta).toHaveProperty('eslint-plugin-better-tailwindcss', { optional: true })
})

test('the manifest installs nothing for React Doctor and names the plugin as an optional peer', () => {
  expect(manifest.dependencies).not.toHaveProperty('eslint-plugin-react-doctor')
  expect(manifest.peerDependencies).toHaveProperty('eslint-plugin-react-doctor')
  expect(manifest.peerDependenciesMeta).toHaveProperty('eslint-plugin-react-doctor', { optional: true })
})
