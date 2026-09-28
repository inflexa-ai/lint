import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runTypecheck } from '../run.ts'
import { writeProjects } from './projects.ts'
import { visits } from './test-plugin.ts'

const index = fileURLToPath(new URL('../index.ts', import.meta.url))
const testPlugin = fileURLToPath(new URL('./test-plugin.ts', import.meta.url))

function tsconfig(include: string[], compilerOptions: Record<string, unknown> = {}): string {
  return JSON.stringify({ compilerOptions: { strict: true, target: 'es2023', module: 'nodenext', types: [], ...compilerOptions }, include })
}

/** A configuration that turns on the rules of the test plugin for the globs. */
function config(rules: Record<string, string[]>): string {
  const overrides = Object.entries(rules).map(([rule, files]) => ({ files, rules: { [`test/${rule}`]: 'error' } }))
  return [
    `import { typecheck } from ${JSON.stringify(index)}`,
    `import { plugin } from ${JSON.stringify(testPlugin)}`,
    `export default typecheck({ plugins: [plugin], overrides: ${JSON.stringify(overrides)} })`,
    '',
  ].join('\n')
}

let root = ''
let cleanup = async (): Promise<void> => {}

beforeAll(async () => {
  ;({ root, cleanup } = await writeProjects({
    reports: {
      'typecheck.config.ts': config({ calls: ['src/**'] }),
      'tsconfig.json': tsconfig(['src']),
      'src/b.ts': `export function run(): void {}\nrun()\nexport const n: number = 's'\n`,
      'src/a.ts': `import { run } from './b.js'\n\n  /* leading */ run()\n`,
    },
    walk: {
      'typecheck.config.ts': config({ calls: ['src/**'], identifiers: ['src/**'] }),
      'tsconfig.json': tsconfig(['src']),
      'src/a.ts': `export function f(): void {}\nf()\nf()\n`,
    },
    shared: {
      'typecheck.config.ts': config({ project: ['**'] }),
      'strict/tsconfig.json': tsconfig(['../shared.ts', 'a.ts']),
      'strict/a.ts': `export const a = 1\n`,
      'loose/tsconfig.json': tsconfig(['../shared.ts', 'b.ts'], { strict: false }),
      'loose/b.ts': `export const b = 1\n`,
      'shared.ts': `export const shared = 1\n`,
    },
    scope: {
      'app/typecheck.config.ts': config({ project: ['**'] }),
      'app/tsconfig.json': tsconfig(['src', '../outside/c.ts']),
      'app/src/a.ts': `import { pkg } from 'pkg'\nimport { c } from '../../outside/c.js'\nexport const a = pkg + c\n`,
      'app/src/types.d.ts': `declare const declared: number\n`,
      'app/node_modules/pkg/package.json': JSON.stringify({ name: 'pkg', types: './index.ts' }),
      'app/node_modules/pkg/index.ts': `export const pkg = 1\n`,
      'outside/c.ts': `export const c = 1\n`,
    },
    'byte-order-mark': {
      'typecheck.config.ts': config({ calls: ['src/**'] }),
      'tsconfig.json': tsconfig(['src']),
      'src/a.ts': `\uFEFFexport function run(): void {}\n  run()\n`,
    },
    clean: {
      'typecheck.config.ts': config({ calls: ['src/**'] }),
      'tsconfig.json': tsconfig(['src']),
      'src/a.ts': `export const a = 1\n`,
    },
  }))
})

afterAll(async () => {
  await cleanup()
})

describe('the rules', () => {
  it('print each report after the diagnostics, sorted by path, line and column, at the start of the node, with the data of the message', async () => {
    const result = await runTypecheck({ cwd: path.join(root, 'reports'), projects: [] })
    expect(result.output).toBe(
      [
        `src/b.ts(3,14): error TS2322: Type 'string' is not assignable to type 'number'.`,
        'src/a.ts(3,17): error test/calls: This calls `run`.',
        'src/b.ts(2,1): error test/calls: This calls `run`.',
        '',
      ].join('\n'),
    )
    expect(result.exitCode).toBe(1)
  })

  it('walk each file once for all the rules that are on for it', async () => {
    visits.length = 0
    await runTypecheck({ cwd: path.join(root, 'walk'), projects: [] })
    expect(visits.map((visit) => visit.split(':')[0])).toEqual(['calls', 'identifiers', 'calls', 'identifiers'])
  })

  it('run once on a file of two projects, in the first project of the -p order', async () => {
    const cwd = path.join(root, 'shared')
    const loose = await runTypecheck({ cwd, projects: ['loose', 'strict'] })
    expect(loose.output.split('\n').filter((line) => line.startsWith('shared.ts'))).toEqual(['shared.ts(1,1): error test/project: The project of this file sets strict to false.'])
    const strict = await runTypecheck({ cwd, projects: ['strict', 'loose'] })
    expect(strict.output.split('\n').filter((line) => line.startsWith('shared.ts'))).toEqual(['shared.ts(1,1): error test/project: The project of this file sets strict to true.'])
  })

  it('leave out declaration files, files under node_modules, and files outside the working folder', async () => {
    const result = await runTypecheck({ cwd: path.join(root, 'scope', 'app'), projects: [] })
    expect(result.output).toBe('src/a.ts(1,1): error test/project: The project of this file sets strict to true.\n')
  })

  it('report at the column that TypeScript gives in a file with a byte order mark', async () => {
    const result = await runTypecheck({ cwd: path.join(root, 'byte-order-mark'), projects: [] })
    expect(result.output).toBe('src/a.ts(2,3): error test/calls: This calls `run`.\n')
  })

  it('exit with 0 and print nothing on a clean run', async () => {
    expect(await runTypecheck({ cwd: path.join(root, 'clean'), projects: [] })).toEqual({ output: '', exitCode: 0 })
  })
})
