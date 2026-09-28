import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runTypecheck } from '../run.ts'
import { writeProjects } from './projects.ts'

const index = fileURLToPath(new URL('../index.ts', import.meta.url))
const testPlugin = fileURLToPath(new URL('./test-plugin.ts', import.meta.url))

const TSCONFIG = JSON.stringify({ compilerOptions: { strict: true, target: 'es2023', module: 'nodenext', types: [] }, include: ['src'] })

// `test/calls` reports each call under src/on, and no rule is on under src/off.
const CONFIG = [
  `import { typecheck } from ${JSON.stringify(index)}`,
  `import { plugin } from ${JSON.stringify(testPlugin)}`,
  `export default typecheck({ plugins: [plugin], overrides: [{ files: ['src/on/**'], rules: { 'test/calls': 'error' } }, { files: ['src/off/**'], rules: { 'no-generated-empty-object-type': 'off' } }] })`,
  '',
].join('\n')

const RUN = `export function run(): void {}\n`

const NO_REASON = 'error typecheck-disable: The directive gives no reason. Write the reason after ` -- `.'
const NO_RULE = 'error typecheck-disable: The directive names no rule. Name each rule that it disables, and the reason after ` -- `.'
const unused = (id: string) => `error typecheck-disable: \`${id}\` reports nothing on the next line, so the directive does not suppress it. Remove \`${id}\` from the directive.`

let root = ''
let cleanup = async (): Promise<void> => {}

/** The output of the command for one file under src/on, or under src/off with `off`. */
async function check(text: string, { off = false } = {}): Promise<string[]> {
  const cwd = path.join(root, 'project')
  await writeFile(path.join(cwd, 'src', off ? 'off' : 'on', 'case.ts'), RUN + text)
  await writeFile(path.join(cwd, 'src', off ? 'on' : 'off', 'case.ts'), RUN)
  const { output } = await runTypecheck({ cwd, projects: [] })
  return output.split('\n').filter(Boolean)
}

beforeAll(async () => {
  ;({ root, cleanup } = await writeProjects({
    project: { 'typecheck.config.ts': CONFIG, 'tsconfig.json': TSCONFIG, 'src/on/case.ts': RUN, 'src/off/case.ts': RUN },
  }))
})

afterAll(async () => {
  await cleanup()
})

describe('typecheck-disable-next-line', () => {
  it('suppresses a report of the rule on the next line when it gives a reason', async () => {
    expect(await check(`// typecheck-disable-next-line test/calls -- the caller logs the error\nrun()\nrun()\n`)).toEqual([
      'src/on/case.ts(4,1): error test/calls: This calls `run`.',
    ])
  })

  it('reports a directive without a reason, and still suppresses the report', async () => {
    expect(await check(`  // typecheck-disable-next-line test/calls\nrun()\n`)).toEqual([`src/on/case.ts(2,3): ${NO_REASON}`])
    expect(await check(`// typecheck-disable-next-line test/calls --\nrun()\n`)).toEqual([`src/on/case.ts(2,1): ${NO_REASON}`])
  })

  it('reports a directive that names no rule', async () => {
    expect(await check(`// typecheck-disable-next-line -- the caller logs the error\nrun()\n`)).toEqual([
      `src/on/case.ts(2,1): ${NO_RULE}`,
      'src/on/case.ts(3,1): error test/calls: This calls `run`.',
    ])
  })

  it('reports a named rule that suppresses nothing, an unknown rule, and a rule that is off', async () => {
    expect(await check(`// typecheck-disable-next-line test/calls -- old\nconst a = 1\n`)).toEqual([`src/on/case.ts(2,1): ${unused('test/calls')}`])
    expect(await check(`// typecheck-disable-next-line test/calls, test/nope -- old\nrun()\n`)).toEqual([`src/on/case.ts(2,1): ${unused('test/nope')}`])
    expect(await check(`// typecheck-disable-next-line test/project -- old\nrun()\n`)).toEqual([
      `src/on/case.ts(2,1): ${unused('test/project')}`,
      'src/on/case.ts(3,1): error test/calls: This calls `run`.',
    ])
  })

  it('reads the directives of a file where no rule is on', async () => {
    expect(await check(`// typecheck-disable-next-line test/calls -- old\nrun()\n`, { off: true })).toEqual([`src/off/case.ts(2,1): ${unused('test/calls')}`])
  })

  it('reads a block comment on one line and on more than one line, and targets the line after its last line', async () => {
    expect(await check(`/* typecheck-disable-next-line test/calls -- the caller logs the error */\nrun()\n`)).toEqual([])
    expect(await check(`/* typecheck-disable-next-line test/calls\n   -- the caller logs\n   the error */\nrun()\n`)).toEqual([])
    expect(await check(`/* typecheck-disable-next-line test/calls\n   -- the caller logs the error */ run()\nrun()\n`)).toEqual([
      'src/on/case.ts(3,36): error test/calls: This calls `run`.',
    ])
  })

  it('does not read directive text in a string or a template', async () => {
    expect(await check(`const s = '// typecheck-disable-next-line test/calls -- no'\nrun()\n`)).toEqual(['src/on/case.ts(3,1): error test/calls: This calls `run`.'])
    expect(await check('const t = `${1}\n// typecheck-disable-next-line test/calls -- no`\nrun()\n')).toEqual(['src/on/case.ts(4,1): error test/calls: This calls `run`.'])
  })

  it('suppresses each rule that it names', async () => {
    const plugin = `import { typecheck } from ${JSON.stringify(index)}\nimport { plugin } from ${JSON.stringify(testPlugin)}\nexport default typecheck({ plugins: [plugin], overrides: [{ files: ['src/**'], rules: { 'test/calls': 'error', 'test/project': 'error' } }] })\n`
    const { root: dir, cleanup: remove } = await writeProjects({
      several: {
        'typecheck.config.ts': plugin,
        'tsconfig.json': TSCONFIG,
        'src/a.ts': `// typecheck-disable-next-line test/calls, test/project -- both\nrun()\nfunction run(): void {}\n`,
      },
    })
    try {
      expect((await runTypecheck({ cwd: path.join(dir, 'several'), projects: [] })).output).toBe('')
    } finally {
      await remove()
    }
  })

  it('does not suppress a diagnostic of tsc', async () => {
    expect(await check(`// typecheck-disable-next-line test/calls -- the caller logs the error\nrun(); const n: number = 's'\n`)).toEqual([
      `src/on/case.ts(3,14): error TS2322: Type 'string' is not assignable to type 'number'.`,
    ])
  })
})
