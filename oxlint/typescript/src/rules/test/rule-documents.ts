import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ESLint } from 'eslint'

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url))

/** Each rule of a plugin that does not link to its document `docs/rules/<prefix><rule>.md`, or whose document is missing. */
export function ruleDocumentProblems(plugin: ESLint.Plugin, prefix = ''): string[] {
  const rules = Object.entries(plugin.rules ?? {})
  if (rules.length === 0) return ['the plugin has no rules']

  return rules.flatMap(([name, rule]) => {
    const document = `${prefix}${name}.md`
    const url = rule.meta?.docs?.url
    const expected = `https://github.com/inflexa-ai/lint/blob/main/docs/rules/${document}`
    const file = path.join(repoRoot, 'docs', 'rules', document)
    const problems: string[] = []
    if (url !== expected) problems.push(`${name}: meta.docs.url is ${url ?? 'missing'}, not ${expected}`)
    if (!existsSync(file)) problems.push(`${name}: ${file} is missing`)
    return problems
  })
}
