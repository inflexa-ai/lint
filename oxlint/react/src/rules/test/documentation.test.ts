import { describe, expect, it } from 'vitest'
import { abortSignalAnyProblems, ruleDocumentProblems } from '../../../../typescript/src/rules/test/rule-documents.ts'
import { plugin } from '../../index.ts'

describe('documentation', () => {
  it('links every rule to its document under docs/rules', () => {
    expect(ruleDocumentProblems(plugin)).toEqual([])
  })

  it('names the first browser versions of AbortSignal.any wherever a rule advises it', () => {
    expect(abortSignalAnyProblems(plugin)).toEqual([])
  })
})
