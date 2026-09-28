#!/usr/bin/env node
// Releases the npm packages of this workspace. Without --publish it is a dry
// run: it checks, builds, stages and packs the packages, and it installs the
// tarballs into a scratch project to prove that they load. It writes only to
// `.release/`, and it publishes nothing. With --publish it also publishes each
// version that npm does not have yet, and it tags the release as
// `oxlint-v<version>`.
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const workspace = fileURLToPath(new URL('..', import.meta.url))
const repositoryRoot = path.resolve(workspace, '..')
const releaseDir = path.join(workspace, '.release')
const requireJson = createRequire(import.meta.url)

// The order of publication: each package after the packages that it depends
// on. The React and Solid packages depend on the TypeScript package, and the
// React package names the typecheck package as a peer.
const PACKAGES = ['typecheck', 'typescript', 'react', 'solid']

const { values } = parseArgs({ options: { publish: { type: 'boolean', default: false } } })

/** Runs a command with its output on the terminal, and stops the release when it fails. */
function run(command, args, cwd = workspace) {
  console.log(`$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) fail(`${command} ${args.join(' ')} exited with status ${String(result.status)}`)
}

/** Runs a command and returns its output, its error output and its status. */
function capture(command, args, cwd = workspace) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() }
}

function fail(message) {
  console.error(`release: ${message}`)
  process.exit(1)
}

/** The export map without the `source` condition, which points at `src/`, and the tarball holds no `src/`. */
function withoutSource(exports) {
  return Object.fromEntries(
    Object.entries(exports).map(([key, target]) =>
      typeof target === 'string' ? [key, target] : [key, Object.fromEntries(Object.entries(target).filter(([condition]) => condition !== 'source'))],
    ),
  )
}

/**
 * Whether npm already has this version of the package. The registry can answer 404 for minutes after a publish, thus the
 * loop below trusts the exit status of `npm publish`, and this check decides only whether an attempt is necessary.
 */
async function published(name, version) {
  const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}/${version}`)
  if (response.status === 404) return false
  if (!response.ok) fail(`the registry answered ${String(response.status)} for ${name}@${version}`)
  return true
}

function sleep(seconds) {
  spawnSync('sleep', [String(seconds)])
}

const packages = PACKAGES.map((dir) => ({ dir, manifest: requireJson(path.join(workspace, dir, 'package.json')) }))
const version = packages[0].manifest.version
for (const { manifest } of packages) {
  if (manifest.version !== version) fail(`the packages share one version, but ${manifest.name} is ${manifest.version} and ${packages[0].manifest.name} is ${version}`)
}
const tag = `oxlint-v${version}`
const scopeNames = new Set(packages.map(({ manifest }) => manifest.name))

if (values.publish) {
  // A release comes from the commit that main holds, with nothing on top.
  const onMain = process.env.GITHUB_ACTIONS === 'true' ? process.env.GITHUB_REF === 'refs/heads/main' : capture('git', ['branch', '--show-current']).stdout === 'main'
  if (!onMain) fail('publish from main')
  if (capture('git', ['status', '--porcelain', '--untracked-files=no']).stdout !== '') fail('the working tree has changes; commit or remove them first')
  const head = capture('git', ['rev-parse', 'HEAD']).stdout
  const remoteMain = capture('git', ['ls-remote', 'origin', 'refs/heads/main']).stdout.split(/\s/)[0]
  if (head !== remoteMain) fail(`HEAD (${head}) is not origin/main (${remoteMain}); pull or push first`)
}

console.log(`\nrelease: ${packages.map(({ manifest }) => manifest.name).join(', ')} at ${version}${values.publish ? '' : ' (dry run)'}\n`)

rmSync(releaseDir, { recursive: true, force: true })
run('npm', ['run', 'format:check'])
run('npm', ['run', 'typecheck'])
run('npm', ['test'])
run('npm', ['run', 'lint'])
run('npm', ['run', 'build'])

const tarballDir = path.join(releaseDir, 'tarballs')
mkdirSync(tarballDir, { recursive: true })

const staged = []
for (const { dir, manifest } of packages) {
  const target = path.join(releaseDir, manifest.name.replace('@inflexa-ai/', ''))
  cpSync(path.join(workspace, dir, 'dist'), path.join(target, 'dist'), { recursive: true })
  cpSync(path.join(workspace, dir, 'LICENSE'), path.join(target, 'LICENSE'))
  cpSync(path.join(workspace, dir, 'README.md'), path.join(target, 'README.md'))
  // The notice of the upstream license of a ported rule.
  const notice = existsSync(path.join(workspace, dir, 'NOTICE'))
  if (notice) cpSync(path.join(workspace, dir, 'NOTICE'), path.join(target, 'NOTICE'))

  // A dependency or a peer on a package of this workspace names the shared version.
  const withSharedVersion = (entries = {}) => Object.fromEntries(Object.entries(entries).map(([name, range]) => [name, scopeNames.has(name) ? version : range]))
  const dependencies = withSharedVersion(manifest.dependencies)
  const stagedManifest = {
    name: manifest.name,
    version,
    description: manifest.description,
    keywords: manifest.keywords,
    license: manifest.license,
    // Trusted publishing from GitHub Actions accepts a package only when its
    // `repository.url` names the repository of the workflow.
    repository: manifest.repository,
  }
  stagedManifest.type = manifest.type
  stagedManifest.exports = withoutSource(manifest.exports)
  if (manifest.bin) stagedManifest.bin = manifest.bin
  stagedManifest.files = notice ? ['dist', 'NOTICE'] : ['dist']
  stagedManifest.engines = { node: '>=22.18.0' }
  stagedManifest.publishConfig = { access: 'public' }
  stagedManifest.peerDependencies = withSharedVersion(manifest.peerDependencies)
  if (manifest.peerDependenciesMeta) stagedManifest.peerDependenciesMeta = manifest.peerDependenciesMeta
  if (Object.keys(dependencies).length > 0) stagedManifest.dependencies = dependencies
  writeFileSync(path.join(target, 'package.json'), `${JSON.stringify(stagedManifest, null, 2)}\n`)

  run('npm', ['pack', '--pack-destination', tarballDir], target)
  staged.push({ name: manifest.name, target, tarball: path.join(tarballDir, `${manifest.name.replace('@', '').replace('/', '-')}-${version}.tgz`) })
}

// The smoke test installs the tarballs as a repository installs them, runs
// oxlint with the factory of the React package and with the factory of the
// Solid package, and runs inflexa-typecheck on a type error and a type that
// resolves to `{}`. It runs outside this repository, because oxlint obeys the
// .gitignore that hides `.release/`.
const smoke = mkdtempSync(path.join(tmpdir(), 'oxlint-release-smoke-'))
mkdirSync(path.join(smoke, 'src'), { recursive: true })
writeFileSync(path.join(smoke, 'package.json'), `${JSON.stringify({ name: 'smoke', private: true, type: 'module' }, null, 2)}\n`)
writeFileSync(path.join(smoke, '.gitignore'), 'node_modules/\n')
writeFileSync(path.join(smoke, 'src', 'shape.ts'), 'interface Shape {\n  a: string\n}\n\nexport type Exported = Shape\n')
writeFileSync(path.join(smoke, 'src', 'view.tsx'), 'export const View = ({ label }: { label: string }): unknown => <text>{label}</text>\n')
writeFileSync(path.join(smoke, 'src', 'typed.ts'), "export const count: number = 'one'\n\nexport type Rest = Omit<{ a: string }, 'a'>\n")
writeFileSync(
  path.join(smoke, 'tsconfig.json'),
  `${JSON.stringify({ compilerOptions: { strict: true, target: 'es2023', module: 'nodenext', noEmit: true, types: [] }, include: ['src'] }, null, 2)}\n`,
)
writeFileSync(
  path.join(smoke, 'oxlint.config.ts'),
  "import { react } from '@inflexa-ai/oxlint-plugin-react'\n\nconst config = react()\n\nexport default { ...config, options: { ...config.options, typeAware: false } }\n",
)
writeFileSync(
  path.join(smoke, 'oxlint.solid.config.ts'),
  "import { solid } from '@inflexa-ai/oxlint-plugin-solid'\n\nconst config = solid()\n\nexport default { ...config, options: { ...config.options, typeAware: false } }\n",
)
const root = requireJson(path.join(workspace, 'package.json'))
run(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    ...staged.map(({ tarball }) => tarball),
    `oxlint@${root.devDependencies.oxlint}`,
    `oxlint-tsgolint@${root.devDependencies['oxlint-tsgolint']}`,
    `typescript@${root.devDependencies.typescript}`,
  ],
  smoke,
)
const lint = capture('npx', ['--no-install', 'oxlint'], smoke)
if (lint.status !== 1 || !lint.stdout.includes('@inflexa-ai(no-interface)')) fail(`the smoke run of oxlint did not report no-interface:\n${lint.stdout}\n${lint.stderr}`)
const solidLint = capture('npx', ['--no-install', 'oxlint', '-c', 'oxlint.solid.config.ts'], smoke)
if (solidLint.status !== 1 || !solidLint.stdout.includes('@inflexa-ai(no-interface)') || !solidLint.stdout.includes('solid(')) {
  fail(`the smoke run of oxlint with solid() did not report no-interface and a rule of eslint-plugin-solid:\n${solidLint.stdout}\n${solidLint.stderr}`)
}
const typecheck = capture('npx', ['--no-install', 'inflexa-typecheck'], smoke)
if (
  typecheck.status !== 1 ||
  !typecheck.stdout.includes('src/typed.ts(1,14): error TS2322') ||
  !typecheck.stdout.includes('src/typed.ts(3,20): error no-generated-empty-object-type')
) {
  fail(`the smoke run of inflexa-typecheck did not report the type error and the empty object type:\n${typecheck.stdout}\n${typecheck.stderr}`)
}
const guard = capture('npx', ['--no-install', 'directive-guard', 'src'], smoke)
if (guard.status !== 0) fail(`directive-guard failed:\n${guard.stderr}`)
rmSync(smoke, { recursive: true, force: true })
console.log('\nrelease: the tarballs install and load')

if (!values.publish) {
  console.log(`\nrelease: dry run done. The packages are in ${path.relative(workspace, releaseDir)}/. Run with --publish to publish them.`)
  process.exit(0)
}

for (const { name, target } of staged) {
  // A PUT that failed on this side can still land on the registry, thus each
  // attempt asks the registry first.
  for (let attempt = 1; ; attempt++) {
    if (await published(name, version)) {
      console.log(`release: ${name}@${version} is on npm`)
      break
    }
    if (attempt > 3) fail(`${name}@${version} did not publish after 3 attempts`)
    console.log(`release: publish ${name}@${version} (attempt ${String(attempt)} of 3)`)
    if (spawnSync('npm', ['publish'], { cwd: target, stdio: 'inherit' }).status === 0) break
    sleep(30 * attempt)
  }
}

if (capture('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`]).status === 0) {
  console.log(`release: the tag ${tag} exists`)
} else {
  run('git', ['tag', tag, 'HEAD'], repositoryRoot)
  run('git', ['push', 'origin', `refs/tags/${tag}`], repositoryRoot)
}
console.log(`\nrelease: ${version} is out`)
