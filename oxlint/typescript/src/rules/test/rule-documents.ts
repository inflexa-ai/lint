import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url))

/** A plugin of oxlint or of `inflexa-typecheck`: each rule names its document in `meta.docs.url`. */
type DocumentedPlugin = { rules?: Record<string, { meta?: { docs?: { url?: string }; messages?: Record<string, string> } }> }

/** Each rule of a plugin that does not link to its document `docs/rules/<prefix><rule>.md`, or whose document is missing. */
export function ruleDocumentProblems(plugin: DocumentedPlugin, prefix = ''): string[] {
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

/** The first versions that ship `AbortSignal.any`, after the browser compatibility data of MDN. */
const abortSignalAnyBrowsers = ['Chrome 116', 'Edge 116', 'Firefox 124', 'Safari 17.4']

/** Each message and each document of a rule that advises `AbortSignal.any` without one of the first browser versions that ship it. */
export function abortSignalAnyProblems(plugin: DocumentedPlugin, prefix = ''): string[] {
  return Object.entries(plugin.rules ?? {}).flatMap(([name, rule]) => {
    const texts = Object.entries(rule.meta?.messages ?? {}).map(([id, message]) => ({ where: `the message ${id}`, text: message }))
    const file = path.join(repoRoot, 'docs', 'rules', `${prefix}${name}.md`)
    if (existsSync(file)) texts.push({ where: 'the document', text: readFileSync(file, 'utf8') })
    return texts
      .filter(({ text }) => text.includes('AbortSignal.any'))
      .flatMap(({ where, text }) =>
        abortSignalAnyBrowsers.filter((browser) => !text.includes(browser)).map((browser) => `${name}: ${where} advises AbortSignal.any without ${browser}`),
      )
  })
}

/** Each ported rule whose document does not name its upstream package and the MIT license. */
export function portedDocumentProblems(ported: Record<string, string>): string[] {
  return Object.entries(ported).flatMap(([name, upstream]) => {
    const document = readFileSync(path.join(repoRoot, 'docs', 'rules', `${name}.md`), 'utf8')
    const problems: string[] = []
    if (!document.includes(upstream)) problems.push(`${name}: the document does not name ${upstream}`)
    if (!document.includes('MIT')) problems.push(`${name}: the document does not name the MIT license`)
    return problems
  })
}
