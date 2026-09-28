import { describe, expect, it } from 'vitest'
import { plugin } from '../../index.ts'
import { ruleDocumentProblems } from './rule-documents.ts'

describe('documentation', () => {
  it('links every rule to its document under docs/rules', () => {
    expect(ruleDocumentProblems(plugin)).toEqual([])
  })
})
