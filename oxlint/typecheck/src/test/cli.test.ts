import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { writeProjects } from './projects.ts'

const cli = fileURLToPath(new URL('../cli.ts', import.meta.url))
const index = fileURLToPath(new URL('../index.ts', import.meta.url))

const TSCONFIG = JSON.stringify({ compilerOptions: { strict: true, target: 'es2023', module: 'nodenext', types: [] }, include: ['src'] })

let root = ''
let cleanup = async (): Promise<void> => {}

beforeAll(async () => {
  ;({ root, cleanup } = await writeProjects({
    app: {
      'tsconfig.json': TSCONFIG,
      'src/a.ts': `type Empty = Omit<{ a: string }, 'a'>\nexport const empty: Empty = {}\n`,
      'lint/off.config.ts': `import { typecheck } from ${JSON.stringify(index)}\nexport default typecheck({ overrides: [{ files: ['**'], rules: { 'no-generated-empty-object-type': 'off' } }] })\n`,
    },
    lib: { 'tsconfig.json': TSCONFIG, 'src/a.ts': `export const n: number = 's'\n` },
  }))
})

afterAll(async () => {
  await cleanup()
})

function run(cwd: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' })
}

describe('inflexa-typecheck', () => {
  it('checks tsconfig.json of the working folder without -p, and exits with 1 on a report', () => {
    expect(run(path.join(root, 'app'))).toMatchObject({
      status: 1,
      stdout: 'src/a.ts(1,14): error no-generated-empty-object-type: This type resolves to `{}`, the empty object type. This was likely not intentional.\n',
    })
  })

  it('takes the configuration of --config', () => {
    expect(run(path.join(root, 'app'), '--config', 'lint/off.config.ts')).toMatchObject({ status: 0, stdout: '', stderr: '' })
  })

  it('checks each project of -p in order', () => {
    const result = run(root, '-p', 'lib', '-p', 'app/tsconfig.json', '--config', 'app/lint/off.config.ts')
    expect(result).toMatchObject({ status: 1, stdout: `lib/src/a.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.\n` })
  })

  it('names a project that does not exist, and exits with 1', () => {
    const result = run(root, '-p', 'missing/tsconfig.json')
    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('missing/tsconfig.json')
  })

  it('names an option that it does not know, and exits with 1', () => {
    const result = run(root, '--watch')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Unknown option '--watch'")
  })
})
