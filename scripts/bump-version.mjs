#!/usr/bin/env node
// Bumps the shared version of the npm workspace to a new semver. It rewrites
// the version in each package manifest, moves each workspace-scoped range to
// the new version, and refreshes `oxlint/package-lock.json`. It runs no git
// command; the caller commits. With --dry-run it prints the plan and writes
// nothing.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const defaultRoot = fileURLToPath(new URL('..', import.meta.url))

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

// The same package order that scripts/release.mjs publishes in: each package
// after the packages that it depends on.
const PACKAGES = ['typecheck', 'typescript', 'react', 'solid']
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

const { values, positionals } = parseArgs({
  options: { 'dry-run': { type: 'boolean', default: false }, root: { type: 'string', default: defaultRoot } },
  allowPositionals: true,
})

function fail(message) {
  console.error(`bump: ${message}`)
  process.exit(1)
}

const [target] = positionals
if (positionals.length !== 1 || !SEMVER.test(target)) {
  fail(`give one semver version, for example 0.7.0${positionals.length > 0 ? `, not "${positionals[0]}"` : ''}`)
}

const root = path.resolve(values.root)
const oxlintDir = path.join(root, 'oxlint')

const packages = PACKAGES.map((dir) => {
  const file = path.join(oxlintDir, dir, 'package.json')
  if (!existsSync(file)) fail(`${file} does not exist`)
  let manifest
  try {
    manifest = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`${file} does not hold valid JSON: ${error.message}`)
  }
  return { dir, file, manifest }
})

const current = packages[0].manifest.version
for (const { manifest } of packages.slice(1)) {
  if (manifest.version !== current) {
    fail(`the packages share one version, but ${manifest.name} is ${manifest.version} and ${packages[0].manifest.name} is ${current}`)
  }
}

if (target === current) fail(`the workspace already sits at ${target}`)

// A version that the registry already has would publish nothing at merge time.
for (const { manifest } of packages) {
  let known
  try {
    const response = await fetch(`https://registry.npmjs.org/${manifest.name.replace('/', '%2f')}/${target}`)
    known = response.ok
  } catch {
    known = null
  }
  if (known === true) fail(`${manifest.name}@${target} is already on the npm registry`)
  if (known === null) console.log(`bump: the registry did not answer for ${manifest.name}; the release run makes that check again`)
}

const scopeNames = new Set(packages.map(({ manifest }) => manifest.name))

const changedFiles = []
for (const pkg of packages) {
  const before = readFileSync(pkg.file, 'utf8')
  pkg.manifest.version = target
  for (const field of DEP_FIELDS) {
    const deps = pkg.manifest[field]
    if (!deps) continue
    for (const [name, range] of Object.entries(deps)) {
      if (scopeNames.has(name) && typeof range === 'string' && range.includes(current)) {
        deps[name] = range.split(current).join(target)
      }
    }
  }
  const after = JSON.stringify(pkg.manifest, null, 2) + '\n'
  if (after === before) continue
  if (!values['dry-run']) writeFileSync(pkg.file, after)
  changedFiles.push(path.relative(root, pkg.file))
}

const verb = values['dry-run'] ? 'would write' : 'wrote'
for (const file of changedFiles) console.log(`bump: ${verb} ${file}`)

const lockfile = path.join(oxlintDir, 'package-lock.json')
if (!existsSync(lockfile)) {
  console.log('bump: no package-lock.json at oxlint/, so the lockfile needs no refresh')
} else if (values['dry-run']) {
  console.log('bump: would run npm install --package-lock-only --no-audit --no-fund at oxlint/')
} else {
  console.log('$ npm install --package-lock-only --no-audit --no-fund')
  const result = spawnSync('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { cwd: oxlintDir, stdio: 'inherit' })
  if (result.status !== 0) fail(`npm install --package-lock-only exited with status ${String(result.status)}`)
}

console.log(`bump: ${current} -> ${target}${values['dry-run'] ? ' (dry run, nothing written)' : ''}`)
if (!values['dry-run']) {
  console.log('bump: next, run `node scripts/release.mjs` at oxlint/ to prove the release, then commit with `git commit -s`')
}
