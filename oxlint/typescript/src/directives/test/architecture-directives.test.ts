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
    expect(find(`// oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-only\nrun()`)).toEqual([])
    expect(find(`/* oxlint-disable typescript/no-explicit-any -- wire type */`)).toEqual([])
    expect(find(`/* eslint-enable @inflexa-ai/react/no-raw-state */`)).toEqual([])
    expect(find(`// we never disable @inflexa-ai/react/no-raw-state here`)).toEqual([])
    // A longer word that starts the same way is not a directive.
    expect(find(`// eslint-disabled @inflexa-ai/react/no-raw-state`)).toEqual([])
    expect(find(`// oxlint-disabled @inflexa-ai/react/no-raw-state`)).toEqual([])
  })

  it('reports every form of directive that names an architecture rule', () => {
    expect(find(`// oxlint-disable-next-line @inflexa-ai/react/no-raw-state\nx`)).toHaveLength(1)
    expect(find(`x // oxlint-disable-line @inflexa-ai/react/no-raw-effect`)).toHaveLength(1)
    expect(find(`/* oxlint-disable @inflexa-ai/react/no-raw-effect, @inflexa-ai/react/no-raw-context -- "just once" */`)).toHaveLength(2)
    expect(find(`/* oxlint-disable\n  @inflexa-ai/react/store-placement\n*/`)).toHaveLength(1)
    expect(find(`/* oxlint-disable @inflexa-ai/no-interface */`)).toHaveLength(1)
    expect(find(`/* oxlint-enable @inflexa-ai/no-interface */`)).toEqual([])
  })

  it('reports a typecheck directive that names an architecture rule, where its comment starts', () => {
    expect(find(`// typecheck-disable-next-line @inflexa-ai/react/no-inline-query-key -- the query key is stable here\nx`)).toEqual([
      expect.objectContaining({ line: 1, column: 1 }),
    ])
    expect(find(`const a = 1\n  /* typecheck-disable-next-line @inflexa-ai/react/no-raw-state */\nx`)).toEqual([expect.objectContaining({ line: 2, column: 3 })])
  })

  it('reports a directive across the Unicode whitespace that the command trims', () => {
    expect(find(`//\u00a0typecheck-disable-next-line @inflexa-ai/react/no-inline-query-key -- the query key is stable here\nx`)).toEqual([
      expect.objectContaining({ line: 1, column: 1 }),
    ])
    expect(find(`//\u00a0oxlint-disable-next-line @inflexa-ai/react/no-raw-state\nx`)).toEqual([expect.objectContaining({ line: 1, column: 1 })])
    const violations = find(`//\u00a0typecheck-disable @inflexa-ai/react/no-raw-state`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('No tool of this repository reads `typecheck-disable`')
  })

  it('stays silent for a typecheck directive that names only rules of another prefix, or no rule', () => {
    expect(find(`// typecheck-disable-next-line @typescript-eslint/no-explicit-any -- wire type\nx`)).toEqual([])
    expect(find(`/* typecheck-disable-next-line typescript/no-explicit-any */`)).toEqual([])
    expect(find(`// typecheck-disable-next-line -- the reason stands alone\nx`)).toEqual([])
    expect(find(`/* typecheck-disable-next-line */`)).toEqual([])
  })

  it('stays silent for a typecheck enable, and for words that only start like the directive', () => {
    expect(find(`/* typecheck-enable @inflexa-ai/react/no-raw-state */`)).toEqual([])
    expect(find(`// typecheck-disable-next @inflexa-ai/react/no-raw-state`)).toEqual([])
    expect(find(`// typecheck-disabled @inflexa-ai/react/no-raw-state`)).toEqual([])
  })

  // No tool of this repository reads the ESLint form, so each one is a leftover
  // that suppresses nothing and misleads the next reader.
  it.each([
    ['line', `x // eslint-disable-line no-console`],
    ['next-line', `// eslint-disable-next-line react-hooks/exhaustive-deps\nrun()`],
    ['block', `/* eslint-disable no-console */`],
    ['block over lines', `/* eslint-disable\n  no-console\n*/`],
    ['rule of another prefix', `// eslint-disable-next-line @typescript-eslint/no-explicit-any\nx`],
    ['reason', `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wire type\nx`],
    ['architecture rule with a reason', `// eslint-disable-next-line @inflexa-ai/test-placement -- the fixture sits beside it\nx`],
    ['blanket', `/* eslint-disable */`],
    ['blanket with a reason', `/* eslint-disable -- trust me */`],
  ])('reports an eslint-disable directive: %s', (_form, text) => {
    for (const violations of [find(text), findAllowing(text), findArchitectureDirectiveViolations(text, ['acme/'])]) {
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('No tool of this repository reads `eslint-disable')
    }
  })

  it.each([
    ['a rule of the guarded prefix', `// typecheck-disable @inflexa-ai/react/no-raw-state\nx`],
    ['a rule of another prefix', `// typecheck-disable @typescript-eslint/no-explicit-any\nx`],
    ['no rule', `/* typecheck-disable */`],
    ['a reason', `/* typecheck-disable -- trust me */`],
    ['the same line', `x // typecheck-disable-line @inflexa-ai/react/no-raw-effect`],
  ])('reports a typecheck form that no tool reads: %s', (_form, text) => {
    expect(find(text)).toHaveLength(1)
  })

  it('names the form that the file carries in each report about a form that no tool reads', () => {
    expect(find(`/* typecheck-disable */`)[0].message).toContain('No tool of this repository reads `typecheck-disable`')
    expect(find(`// typecheck-disable-line @inflexa-ai/react/no-raw-effect`)[0].message).toContain('No tool of this repository reads `typecheck-disable-line`')
    expect(find(`// eslint-disable-line no-console`)[0].message).toContain('No tool of this repository reads `eslint-disable-line`')
  })

  it('locates an eslint-disable directive where it starts', () => {
    expect(find(`const a = 1\n  // eslint-disable-next-line no-console\nx`)).toEqual([expect.objectContaining({ line: 2, column: 3 })])
  })

  it('reports only the architecture rule in a mixed list', () => {
    const violations = find(`// oxlint-disable-next-line no-console, @inflexa-ai/react/store-placement`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('`@inflexa-ai/react/store-placement`')
  })

  it.each([`/* oxlint-disable */`, `// oxlint-disable-next-line\nx`, `/* oxlint-disable -- trust me */`])('reports a directive that names no rule: %s', (text) => {
    const violations = find(text)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('blanket')
  })

  // Every rule of the plugin is covered by the prefix, so a new one needs no
  // change here to be protected; these two are the type-aware pair, where an
  // inline disable would be the easiest way to make a report go away.
  it.each(['@inflexa-ai/react/require-abort-signal', '@inflexa-ai/react/use-query-signal'])('reports an inline disable of %s', (rule) => {
    const violations = find(`// oxlint-disable-next-line ${rule}\nvoid api.get('/p')`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain(`\`${rule}\``)
  })

  it('honours the configured prefixes', () => {
    expect(findArchitectureDirectiveViolations(`// oxlint-disable-next-line acme/no-thing`, ['acme/'])).toHaveLength(1)
    expect(findArchitectureDirectiveViolations(`// oxlint-disable-next-line @inflexa-ai/react/no-raw-state`, ['acme/'])).toEqual([])
  })

  it('locates the directive with 1-based line and column, in source order', () => {
    const text = `const a = 1\n  // oxlint-disable-next-line @inflexa-ai/react/no-raw-state\n/* oxlint-disable */`
    expect(find(text).map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 2, column: 3 },
      { line: 3, column: 1 },
    ])
  })
})

describe('a rule that may be disabled inline', () => {
  it('accepts every form of directive that names it and gives a reason', () => {
    expect(findAllowing(`/* oxlint-disable @inflexa-ai/test-placement -- the fixture is generated beside it */`)).toEqual([])
    expect(findAllowing(`// oxlint-disable-next-line @inflexa-ai/test-placement -- same\nx`)).toEqual([])
  })

  it('asks for the reason when the directive gives none', () => {
    const violations = findAllowing(`// oxlint-disable-next-line @inflexa-ai/test-placement\nx`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('-- <reason>')
  })

  it('asks for the reason in the form of directive that the file used', () => {
    const [violation] = findAllowing(`/* oxlint-disable @inflexa-ai/test-placement */`)
    expect(violation.message).toContain('`oxlint-disable @inflexa-ai/test-placement -- <reason>`')
  })

  it('accepts a typecheck directive that names it and gives a reason', () => {
    expect(findAllowing(`/* typecheck-disable-next-line @inflexa-ai/test-placement -- the fixture is generated beside it */`)).toEqual([])
    expect(findAllowing(`// typecheck-disable-next-line @inflexa-ai/test-placement -- same\nx`)).toEqual([])
  })

  it('asks for the reason in the typecheck form of directive that the file used', () => {
    const [violation] = findAllowing(`// typecheck-disable-next-line @inflexa-ai/test-placement\nx`)
    expect(violation.message).toContain('`typecheck-disable-next-line @inflexa-ai/test-placement -- <reason>`')
  })

  it('judges each rule of a mixed typecheck list on its own', () => {
    const violations = findAllowing(`// typecheck-disable-next-line @inflexa-ai/test-placement, @inflexa-ai/react/no-raw-state -- one reason`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('`@inflexa-ai/react/no-raw-state`')
  })

  it('counts an empty justification as none', () => {
    expect(findAllowing(`/* oxlint-disable @inflexa-ai/test-placement -- */`)).toHaveLength(1)
  })

  it('judges each rule of a mixed list on its own', () => {
    const directive = `// oxlint-disable-next-line @inflexa-ai/test-placement, @inflexa-ai/react/no-raw-state -- one reason`
    const violations = findAllowing(directive)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('`@inflexa-ai/react/no-raw-state`')
  })

  it('is still covered by a blanket disable, reason or not', () => {
    const violations = findAllowing(`/* oxlint-disable -- every rule, this one included */`)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('blanket')
  })

  it('has no exception where none was configured', () => {
    expect(find(`/* oxlint-disable @inflexa-ai/test-placement -- the fixture is generated beside it */`)).toHaveLength(1)
  })
})

describe('checkArchitectureDirectives', () => {
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'architecture-directives-'))
    const files: Record<string, string> = {
      'src/clean.ts': `export const a = 1\n`,
      'src/page.tsx': `const a = 1\n// oxlint-disable-next-line @inflexa-ai/react/no-raw-state\n`,
      'src/nested/store.js': `/* oxlint-disable */\n`,
      'src/notes.md': `/* oxlint-disable */\n`,
      'src/samples/directive.ts': `/* oxlint-disable */\n`,
      'node_modules/pkg/index.js': `/* oxlint-disable */\n`,
      'dist/index.js': `/* oxlint-disable */\n`,
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

  it('fails the command for a typecheck directive and prints where it is', async () => {
    await writeFile(path.join(root, 'src/typed.ts'), '// typecheck-disable-next-line @inflexa-ai/react/no-inline-query-key -- the query key is stable here\n')
    const cli = fileURLToPath(new URL('../cli.ts', import.meta.url))
    const failed = spawnSync(process.execPath, [cli, 'src/typed.ts'], { cwd: root, encoding: 'utf8' })
    expect(failed.status).toBe(1)
    expect(failed.stderr).toContain('src/typed.ts:1:1: `@inflexa-ai/react/no-inline-query-key` is an architecture rule')
  })

  it('takes the prefixes and the rules that can be disabled inline from the command line', () => {
    const cli = fileURLToPath(new URL('../cli.ts', import.meta.url))
    const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' })

    expect(run('--prefix', 'acme/', 'src/page.tsx')).toMatchObject({ status: 0, stderr: '' })
    const inline = run('--allow-inline', '@inflexa-ai/react/no-raw-state', 'src/page.tsx')
    expect(inline.status).toBe(1)
    expect(inline.stderr).toContain('`@inflexa-ai/react/no-raw-state` may be disabled here, but not silently')
  })
})
