import { describe, expect, it } from 'vitest'
import { portedDocumentProblems, ruleDocumentProblems } from '../../../../typescript/src/rules/test/rule-documents.ts'
import { plugin } from '../../typecheck.ts'

describe('documentation of the typecheck plugin', () => {
  it('names the plugin @inflexa-ai/react, and links every rule to its document under docs/rules', () => {
    expect(plugin.name).toBe('@inflexa-ai/react')
    expect(ruleDocumentProblems(plugin)).toEqual([])
  })

  it('names the upstream package and its license in the document of each port', () => {
    expect(portedDocumentProblems({ 'no-void-query-fn': '@tanstack/eslint-plugin-query' })).toEqual([])
  })
})
