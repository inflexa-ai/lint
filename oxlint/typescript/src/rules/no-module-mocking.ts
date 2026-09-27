import { TSESLint, type TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import { exportedName, isGlobalIdentifier, staticMemberName } from '../helpers/static-names.ts'

// The calls that replace a whole module with a stand-in the test framework
// builds, rather than a value the code was handed.
const MOCK_METHODS = new Set(['mock', 'doMock', 'unstable_mockModule'])

// Where each framework object comes from when a file imports it instead of
// taking it from the test globals.
const FRAMEWORKS: Record<string, string> = { vi: 'vitest', jest: '@jest/globals' }

/** The variable an identifier resolves to, looking outward from its scope. */
function variableFor(sourceCode: TSESLint.SourceCode, node: TSESTree.Identifier): TSESLint.Scope.Variable | undefined {
  for (let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)
    if (variable) return variable
  }
  return undefined
}

/**
 * `vi.mock('../db', …)` and `jest.mock` swap a module for a stand-in the
 * framework hoists above the imports, so the test runs a graph the program
 * never assembles: a mock drifts from the module it stands for, the hoisting
 * surprises the next reader, and the test passes while the real wiring is
 * broken.
 *
 * A dependency a test needs to vary is passed in. A hook takes it as an
 * argument, a client is built from an injected `fetch`, a store is created for
 * the test. The stand-in is then a plain value the test controls, and the code
 * under test runs exactly as it does in the app.
 *
 * The framework object is recognised by what it denotes: `vi` and `jest` from
 * the test globals, and the same names imported from `vitest` and
 * `@jest/globals`. A binding of one's own that happens to be called `vi` is
 * left alone, and `vi['mock']` is the same call as `vi.mock`.
 */
export const noModuleMocking: TSESLint.RuleModule<'moduleMock'> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Pass a dependency in instead of mocking its module',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-module-mocking.md',
    },
    schema: [],
    messages: {
      moduleMock:
        '`{{call}}` replaces a whole module with a framework stand-in the runner hoists above the imports, so the test runs a graph the app never assembles. Pass the dependency in instead: take it as an argument, build the client from an injected `fetch`, or make the store the test needs. Then the stand-in is a value the test controls and the code runs as it does in the app.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** Whether an identifier denotes a framework object, as a global or as its import. */
    function isFramework(node: TSESTree.Identifier): boolean {
      if (!(node.name in FRAMEWORKS)) return false
      const variable = variableFor(sourceCode, node)
      if (variable === undefined || variable.defs.length === 0) return isGlobalIdentifier(sourceCode, node)
      return variable.defs.some(
        (def) =>
          def.type === TSESLint.Scope.DefinitionType.ImportBinding &&
          def.parent.type === AST_NODE_TYPES.ImportDeclaration &&
          def.parent.source.value === FRAMEWORKS[node.name] &&
          def.node.type === AST_NODE_TYPES.ImportSpecifier &&
          exportedName(def.node.imported) === node.name,
      )
    }

    return {
      CallExpression(node) {
        const { callee } = node
        if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.object.type !== AST_NODE_TYPES.Identifier || !isFramework(callee.object)) return
        const method = staticMemberName(callee)
        if (method !== undefined && MOCK_METHODS.has(method)) {
          context.report({ node, messageId: 'moduleMock', data: { call: `${callee.object.name}.${method}` } })
        }
      },
    }
  },
}
