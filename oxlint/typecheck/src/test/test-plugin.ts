import { isCallExpression, SyntaxKind } from 'typescript/unstable/ast'
import type { Plugin, RuleModule } from '../rule.ts'

/** The nodes that the rules of the plugin visited, in the order of the visits, for the test of the walk. */
export const visits: string[] = []

const docs = { description: 'A rule of the tests', url: 'https://example.com' }

const calls: RuleModule = {
  meta: { docs, messages: { call: 'This calls `{{name}}`.' }, defaultOptions: {} },
  create(context) {
    return {
      [SyntaxKind.CallExpression]: (node) => {
        visits.push(`calls:${String(node.pos)}`)
        if (isCallExpression(node)) context.report({ node, messageId: 'call', data: { name: node.expression.getText(context.sourceFile) } })
      },
    }
  },
}

const identifiers: RuleModule = {
  meta: { docs, messages: {}, defaultOptions: {} },
  create() {
    return {
      [SyntaxKind.CallExpression]: (node) => {
        visits.push(`identifiers:${String(node.pos)}`)
      },
    }
  },
}

const project: RuleModule = {
  meta: { docs, messages: { project: 'The project of this file sets strict to {{strict}}.' }, defaultOptions: {} },
  create(context) {
    return {
      [SyntaxKind.SourceFile]: (node) => {
        context.report({ node, messageId: 'project', data: { strict: String(context.program.getCompilerOptions().strict) } })
      },
    }
  },
}

export const plugin: Plugin = { name: 'test', rules: { calls, identifiers, project } }
