import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runTypecheck } from '../run.ts'
import { writeProjects } from './projects.ts'

// The `tsc` of the installed package, which the command reads through its API.
const tsc = path.join(path.dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin', 'tsc')

const COMPILER_OPTIONS = { strict: true, target: 'es2023', module: 'nodenext', types: [] }

/** A tsconfig that includes `src`, with the options of each fixture on top of the shared ones. */
function tsconfig(compilerOptions: Record<string, unknown> = {}): string {
  return JSON.stringify({ compilerOptions: { ...COMPILER_OPTIONS, ...compilerOptions }, include: ['src'] }, null, 2)
}

// Each project is one case of the output of `tsc --noEmit --pretty false` that the command copies.
const PROJECTS: Record<string, Record<string, string>> = {
  'type-error': { 'tsconfig.json': tsconfig(), 'src/a.ts': `export const n: number = 's'\n` },
  'syntax-error': { 'tsconfig.json': tsconfig(), 'src/a.ts': `export const = 1\nconst m: number = 's'\n` },
  'declaration-error': {
    'tsconfig.json': tsconfig({ declaration: true }),
    'src/a.ts': `export const make = () =>\n  class {\n    private secret = 1\n  }\nexport const n: number = 's'\n`,
  },
  'declaration-and-syntax-error': {
    'tsconfig.json': tsconfig({ declaration: true }),
    'src/a.ts': `export const make = () =>\n  class {\n    private secret = 1\n  }\nexport const = 1\n`,
  },
  'non-ascii': { 'tsconfig.json': tsconfig(), 'src/a.ts': `export const café = '☕ 𝒳'; export const n: number = 's'\n` },
  'ts-extensions': {
    'tsconfig.json': tsconfig({ allowImportingTsExtensions: true }),
    'src/a.ts': `import { b } from './b.ts'\nexport const a = b\n`,
    'src/b.ts': `export const b = 1\n`,
  },
  'emit-declaration-only': { 'tsconfig.json': tsconfig({ declaration: true, emitDeclarationOnly: true }), 'src/a.ts': `export const a = 1\n` },
  'dangling-options': { 'tsconfig.json': `{\n  "include": ["src"],\n  "compilerOptions":\n}\n`, 'src/a.ts': `export const a: number = 's'\n` },
  'invalid-tsconfig': { 'tsconfig.json': `{\n  "compilerOptions": { "strict": true,, },\n  "include": ["src"]\n`, 'src/a.ts': `export const a: number = 's'\n` },
  'chained-message': {
    'tsconfig.json': tsconfig(),
    'src/a.ts': `type Inner = { value: number }\ntype Outer = { inner: Inner }\nconst source = { inner: { value: 'text' } }\nexport const outer: Outer = source\n`,
  },
  'related-location': { 'tsconfig.json': tsconfig(), 'src/a.ts': `type Shape = { name: string; size: number }\nexport const shape: Shape = { name: 'a' }\n` },
  'no-inputs': { 'tsconfig.json': tsconfig() },
  // The option errors of the real tsconfig, each at its place in that file.
  'base-url': { 'tsconfig.json': tsconfig({ baseUrl: '.' }), 'src/a.ts': `export const a = 1\n` },
  'removed-option': { 'tsconfig.json': tsconfig({ module: 'commonjs', moduleResolution: 'node' }), 'src/a.ts': `export const a = 1\n` },
  'module-conflict': { 'tsconfig.json': tsconfig({ moduleResolution: 'bundler' }), 'src/a.ts': `export const a = 1\n` },
  'isolated-declarations': { 'tsconfig.json': tsconfig({ isolatedDeclarations: true }), 'src/a.ts': `export const a = 1\n` },
  'emit-declaration-only-alone': { 'tsconfig.json': tsconfig({ emitDeclarationOnly: true }), 'src/a.ts': `export const a = 1\n` },
  // The shapes of a tsconfig that the virtual tsconfig adds `noEmit` to.
  'trailing-comma': {
    'tsconfig.json': `{\n  "compilerOptions": {\n    "strict": true,\n    "baseUrl": ".",\n    "types": [],\n  },\n  "include": ["src"],\n}\n`,
    'src/a.ts': `export const n: number = 's'\n`,
  },
  comments: {
    'tsconfig.json': `// "compilerOptions": {\n{\n  /* } */ "compilerOptions": { "strict": true, "types": [], "baseUrl": "./{" } // }\n  , "include": ["src"]\n}\n`,
    'src/a.ts': `export const n: number = 's'\n`,
  },
  // A root `compilerOptions` that is not an object, beside an `extends` whose options need `noEmit`.
  ...Object.fromEntries(
    Object.entries({ 'null-options': 'null', 'string-options': '"x"', 'array-options': '[]' }).map(([name, value]) => [
      name,
      {
        'base.json': JSON.stringify({ compilerOptions: { ...COMPILER_OPTIONS, allowImportingTsExtensions: true } }),
        'tsconfig.json': `{\n  "extends": "./base.json",\n  "compilerOptions": ${value},\n  "include": ["src"]\n}\n`,
        'src/a.ts': `import { b } from './b.ts'\nexport const a = b\n`,
        'src/b.ts': `export const b = 1\n`,
      },
    ]),
  ),
  'empty-options': { 'tsconfig.json': `{ "compilerOptions": {}, "include": ["src"] }\n`, 'src/a.ts': `export const n: number = 's'\n` },
  'no-options': { 'tsconfig.json': `{ "include": ["src"] }\n`, 'src/a.ts': `export const n: number = 's'\n` },
  'no-emit-false': {
    'tsconfig.json': tsconfig({ noEmit: false, allowImportingTsExtensions: true }),
    'src/a.ts': `import { b } from './b.ts'\nexport const a: string = b\n`,
    'src/b.ts': `export const b = 1\n`,
  },
  // TypeScript counts no byte order mark in a position.
  'byte-order-mark': { 'tsconfig.json': tsconfig(), 'src/a.ts': `\uFEFFexport const a = 1\nconst n: number = 's'\n` },
  clean: { 'tsconfig.json': tsconfig(), 'src/a.ts': `export const a = 1\n` },
}

let root = ''
let cleanup = async (): Promise<void> => {}

beforeAll(async () => {
  ;({ root, cleanup } = await writeProjects(PROJECTS))
})

afterAll(async () => {
  await cleanup()
})

function runTsc(cwd: string, project: string): { output: string; exitCode: number } {
  const result = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '-p', project], { cwd, encoding: 'utf8' })
  return { output: result.stdout, exitCode: result.status ?? 1 }
}

describe('the diagnostics of tsc --noEmit', () => {
  it.each(Object.keys(PROJECTS))('prints the output of tsc for the project %s', async (name) => {
    const cwd = `${root}/${name}`
    const expected = runTsc(cwd, '.')
    const actual = await runTypecheck({ cwd, projects: ['.'] })
    expect(actual.output).toBe(expected.output)
    expect(actual.exitCode).toBe(expected.exitCode === 0 ? 0 : 1)
  })

  it('prints the paths relative to a working folder above the project', async () => {
    const expected = runTsc(root, 'type-error')
    const actual = await runTypecheck({ cwd: root, projects: ['type-error'] })
    expect(expected.output).toContain('type-error/src/a.ts(1,14): error TS2322')
    expect(actual.output).toBe(expected.output)
  })

  it('prints the projects in the order of -p, each in the order of tsc', async () => {
    const expected = runTsc(root, 'syntax-error').output + runTsc(root, 'type-error/tsconfig.json').output
    const actual = await runTypecheck({ cwd: root, projects: ['syntax-error', 'type-error/tsconfig.json'] })
    expect(actual.output).toBe(expected)
  })

  it('reads a referenced project that is not built from its sources', async () => {
    const { root: dir, cleanup: remove } = await writeProjects({
      lib: {
        'tsconfig.json': JSON.stringify({ compilerOptions: { ...COMPILER_OPTIONS, composite: true, outDir: 'dist', rootDir: 'src' }, include: ['src'] }),
        'src/index.ts': `export const count: number = 1\n`,
      },
      app: {
        'tsconfig.json': JSON.stringify({ compilerOptions: COMPILER_OPTIONS, include: ['src'], references: [{ path: '../lib' }] }),
        'src/a.ts': `import { count } from '../../lib/src/index.js'\nexport const label: string = count\n`,
      },
    })
    try {
      expect(runTsc(dir, 'app').output).toContain('error TS6305')
      const actual = await runTypecheck({ cwd: dir, projects: ['app'] })
      expect(actual.output).toBe(`app/src/a.ts(2,14): error TS2322: Type 'number' is not assignable to type 'string'.\n`)
    } finally {
      await remove()
    }
  })

  it('never names the tsconfig that it makes', async () => {
    const actual = await runTypecheck({ cwd: root, projects: Object.keys(PROJECTS) })
    expect(actual.output).not.toContain('.inflexa-typecheck')
  })
})
