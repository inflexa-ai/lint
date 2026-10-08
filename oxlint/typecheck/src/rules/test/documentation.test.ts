import { describe, expect, it } from 'vitest'
import { abortSignalAnyProblems, portedDocumentProblems, ruleDocumentProblems } from '../../../../typescript/src/rules/test/rule-documents.ts'
import { rules } from '../index.ts'

describe('documentation', () => {
  it('links every rule to its document under docs/rules', () => {
    expect(ruleDocumentProblems({ rules })).toEqual([])
  })

  it('names the upstream package and its license in the document of each port', () => {
    expect(portedDocumentProblems({ 'must-use-result': '@ninoseki/eslint-plugin-neverthrow', 'no-generated-empty-object-type': 'typescript-eslint' })).toEqual([])
  })

  it('names the first browser versions of AbortSignal.any wherever a rule advises it', () => {
    expect(abortSignalAnyProblems({ rules })).toEqual([])
  })
})
