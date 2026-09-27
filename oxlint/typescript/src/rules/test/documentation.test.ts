import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { plugin } from '../../index.ts'

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url))

describe('documentation', () => {
  it('links every rule to its document under docs/rules', () => {
    const rules = plugin.rules ?? {}
    expect(Object.keys(rules).length).toBeGreaterThan(0)

    for (const [name, rule] of Object.entries(rules)) {
      const url = rule.meta?.docs?.url
      expect(url, `${name}: meta.docs.url`).toBe(`https://github.com/inflexa-ai/lint/blob/main/docs/rules/${name}.md`)

      const file = path.join(repoRoot, 'docs', 'rules', `${name}.md`)
      expect(existsSync(file), `${name}: ${file}`).toBe(true)
    }
  })
})
