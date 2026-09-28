import { describe, expect, it } from 'vitest'
import { ruleDocumentProblems } from '../../../../typescript/src/rules/test/rule-documents.ts'
import { plugin } from '../../index.ts'

describe('documentation', () => {
  it('links every rule to its document under docs/rules, with the prefix of the plugin', () => {
    expect(ruleDocumentProblems(plugin, 'solid-')).toEqual([])
  })
})
