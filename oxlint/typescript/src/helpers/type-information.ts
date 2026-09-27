import type { ParserServices, ParserServicesWithTypeInformation } from '@typescript-eslint/utils'

export type TypeInformation = Pick<ParserServicesWithTypeInformation, 'program' | 'esTreeNodeToTSNodeMap' | 'tsNodeToESTreeNodeMap'>

/**
 * The program of typescript-eslint behind the file that a typed rule checks.
 * Without it the rule can only guess from a name, which is the failure that
 * each typed rule exists to avoid, and a rule that says nothing reads as a
 * clean file. Thus the run stops. oxlint gives a JS plugin no program at all.
 */
export function typeInformationOf(context: { id: string; sourceCode: { parserServices?: Partial<ParserServices> } }): TypeInformation {
  const { program, esTreeNodeToTSNodeMap, tsNodeToESTreeNodeMap } = context.sourceCode.parserServices ?? {}
  if (program && esTreeNodeToTSNodeMap && tsNodeToESTreeNodeMap) return { program, esTreeNodeToTSNodeMap, tsNodeToESTreeNodeMap }
  throw new Error(
    `${context.id} needs the type information of typescript-eslint, and this run gives none. oxlint gives none to a JS plugin: run the rule with ESLint, through the configuration of \`@inflexa-ai/oxlint-plugin/eslint\`.`,
  )
}
