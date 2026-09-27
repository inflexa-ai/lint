import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkArchitectureDirectives, findArchitectureDirectiveViolations } from '../architecture-directives.ts'

const find = (text: string) => findArchitectureDirectiveViolations(text, ['@inflexa-ai/'])
const findAllowing = (text: string) => findArchitectureDirectiveViolations(text, ['@inflexa-ai/'], ['@inflexa-ai/test-placement'])

describe('findArchitectureDirectiveViolations', () => {
  it('ignores directives for other rules and prose that only mentions one', () => {
    expect(find(`// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only\nrun()`)).toEqual([])
    expect(find(`/* eslint-disable @typescript-eslint/no-explicit-any -- wire type */`)).toEqual([])
    expect(find(`/* eslint-enable @inflexa-ai/react/no-raw-state */`)).toEqual([])
    expect(find(`// we never disable @inflexa-ai/react/no-raw-state here`)).toEqual([])
    // A longer word that starts the same way is not a directive.
    expect(find(`// eslint-disabled @inflexa-ai/react/no-raw-state`)).toEqual([])
  })

  it('reports every form of directive that names an architecture rule', () => {
    expect(find(`// eslint-disable-next-line @inflexa-ai/react/no-raw-state\nx`)).toHaveLength(1)
    expect(find(`x // eslint-disable-line @inflexa-ai/react/no-raw-effect`)).toHaveLength(1)
    expect(find(`/* eslint-disable @inflexa-ai/react/no-raw-effect, @inflexa-ai/react/no-raw-context -- "just once" */`)).toHaveLength(2)
    expect(find(`/* eslint-disable\n  @inflexa-ai/react/store-placement\n*/`)).toHaveLength(1)
  })

  it('reports the oxlint form of each directive', () => {
    expect(find(`// oxlint-disable-next-line @inflexa-ai/react/no-raw-state\nx`)).toHaveLength(1)
    expect(find(`x // oxlint-disable-line @inflexa-ai/react/no-raw-effect`)).toHaveLength(1)
    expect(find(`/* oxlint-disable @inflexa-ai/no-interface */`)).toHaveLength(1)
    expect(find(`/* oxlint-enable @inflexa-ai/no-interface */`)).toEqual([])
  })

  it('reports only the architecture rule in a mixed list', () => {
    const violations = find(`// eslint-disable-next-line no-console, @inflexa-ai/react/store-placement`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('`@inflexa-ai/react/store-placement`')
  })

  it.each([`/* eslint-disable */`, `// eslint-disable-next-line\nx`, `/* eslint-disable -- trust me */`, `/* oxlint-disable */`])(
    'reports a directive that names no rule: %s',
    (text) => {
      const violations = find(text)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('blanket')
    },
  )

  // Every rule of the plugin is covered by the prefix, so a new one needs no
  // change here to be protected; these two are the type-aware pair, where an
  // inline disable would be the easiest way to make a report go away.
  it.each(['@inflexa-ai/react/require-abort-signal', '@inflexa-ai/react/use-query-signal'])('reports an inline disable of %s', (rule) => {
    const violations = find(`// eslint-disable-next-line ${rule}\nvoid api.get('/p')`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain(`\`${rule}\``)
  })

  it('honours the configured prefixes', () => {
    expect(findArchitectureDirectiveViolations(`// eslint-disable-next-line acme/no-thing`, ['acme/'])).toHaveLength(1)
    expect(findArchitectureDirectiveViolations(`// eslint-disable-next-line @inflexa-ai/react/no-raw-state`, ['acme/'])).toEqual([])
  })

  it('locates the directive with 1-based line and column, in source order', () => {
    const text = `const a = 1\n  // eslint-disable-next-line @inflexa-ai/react/no-raw-state\n/* eslint-disable */`
    expect(find(text).map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 2, column: 3 },
      { line: 3, column: 1 },
    ])
  })
})

describe('a rule that may be disabled inline', () => {
  it('accepts every form of directive that names it and gives a reason', () => {
    expect(findAllowing(`/* eslint-disable @inflexa-ai/test-placement -- the fixture is generated beside it */`)).toEqual([])
    expect(findAllowing(`// eslint-disable-next-line @inflexa-ai/test-placement -- same\nx`)).toEqual([])
  })

  it('asks for the reason when the directive gives none', () => {
    const violations = findAllowing(`/* eslint-disable @inflexa-ai/test-placement */`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('-- <reason>')
  })

  it('asks for the reason in the form of directive that the file used', () => {
    const [violation] = findAllowing(`/* oxlint-disable @inflexa-ai/test-placement */`)
    expect(violation.message).toContain('`oxlint-disable @inflexa-ai/test-placement -- <reason>`')
  })

  it('counts an empty justification as none', () => {
    expect(findAllowing(`/* eslint-disable @inflexa-ai/test-placement -- */`)).toHaveLength(1)
  })

  it('judges each rule of a mixed list on its own', () => {
    const directive = `// eslint-disable-next-line @inflexa-ai/test-placement, @inflexa-ai/react/no-raw-state -- one reason`
    const violations = findAllowing(directive)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('`@inflexa-ai/react/no-raw-state`')
  })

  it('is still covered by a blanket disable, reason or not', () => {
    const violations = findAllowing(`/* eslint-disable -- every rule, this one included */`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('blanket')
  })

  it('has no exception where none was configured', () => {
    expect(find(`/* eslint-disable @inflexa-ai/test-placement -- the fixture is generated beside it */`)).toHaveLength(1)
  })
})

describe('checkArchitectureDirectives', () => {
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'architecture-directives-'))
    const files: Record<string, string> = {
      'src/clean.ts': `export const a = 1\n`,
      'src/page.tsx': `const a = 1\n// oxlint-disable-next-line @inflexa-ai/react/no-raw-state\n`,
      'src/nested/store.js': `/* eslint-disable */\n`,
      'src/notes.md': `/* eslint-disable */\n`,
      'src/samples/directive.ts': `/* eslint-disable */\n`,
      'node_modules/pkg/index.js': `/* eslint-disable */\n`,
      'dist/index.js': `/* eslint-disable */\n`,
    }
    for (const [file, text] of Object.entries(files)) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true })
      await writeFile(path.join(root, file), text)
    }
  })

  afterAll(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('reads each source file below a folder, and skips the folders that hold no source', async () => {
    const violations = await checkArchitectureDirectives(['.'], { cwd: root })
    expect(violations.map(({ file, line }) => `${file}:${String(line)}`)).toEqual(['src/nested/store.js:1', 'src/page.tsx:2', 'src/samples/directive.ts:1'])
  })

  it('leaves out the files that an ignore glob matches', async () => {
    const violations = await checkArchitectureDirectives(['src'], { cwd: root, ignores: ['src/samples/**'] })
    expect(violations.map(({ file }) => file)).toEqual(['src/nested/store.js', 'src/page.tsx'])
  })

  it('checks a file that the caller names', async () => {
    const violations = await checkArchitectureDirectives(['src/page.tsx', 'src/clean.ts'], { cwd: root })
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatchObject({ file: 'src/page.tsx', line: 2, column: 1 })
  })

  it('fails the command for each violation and prints where it is', () => {
    const cli = fileURLToPath(new URL('../cli.ts', import.meta.url))
    const run = (file: string) => spawnSync(process.execPath, [cli, file], { cwd: root, encoding: 'utf8' })

    const failed = run('src/page.tsx')
    expect(failed.status).toBe(1)
    expect(failed.stderr).toContain('src/page.tsx:2:1: `@inflexa-ai/react/no-raw-state` is an architecture rule')
    expect(run('src/clean.ts')).toMatchObject({ status: 0, stderr: '' })
  })
})
