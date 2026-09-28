import { describe, expect, it } from 'vitest'
import { ruleDocumentProblems } from '../../../../typescript/src/rules/test/rule-documents.ts'
import { plugin } from '../../index.ts'

describe('documentation', () => {
  it('links every rule to its document under docs/rules', () => {
    expect(ruleDocumentProblems(plugin)).toEqual([])
  })
})
