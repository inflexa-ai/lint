import type { ESTree, Rule } from '@oxlint/plugins'
import { exportedName, type Identifier, isGlobalIdentifier, staticMemberName, variableFor } from '../helpers/static-names.ts'

// Each framework object, the module a file imports it from instead of taking
// it from the test globals, and its calls that replace a whole module with a
// stand-in the framework builds, rather than a value the code was handed.
const JEST_LIKE_METHODS = new Set(['mock', 'doMock', 'unstable_mockModule'])
const FRAMEWORKS: Record<string, { source: string; methods: Set<string> }> = {
  vi: { source: 'vitest', methods: JEST_LIKE_METHODS },
  jest: { source: '@jest/globals', methods: JEST_LIKE_METHODS },
  mock: { source: 'bun:test', methods: new Set(['module']) },
}

const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self', 'global'])

/**
 * `vi.mock('../db', …)`, `jest.mock` and `mock.module` of `bun:test` swap a
 * module for a stand-in the framework builds, so the test runs a graph the
 * program never assembles: a mock drifts from the module it stands for, the
 * hoisting of `vi.mock` and `jest.mock` surprises the next reader, and the test
 * passes while the real wiring is broken.
 *
 * A dependency a test needs to vary is passed in. A hook takes it as an
 * argument, a client is built from an injected `fetch`, a store is created for
 * the test. The stand-in is then a plain value the test controls, and the code
 * under test runs exactly as it does in the app.
 *
 * `vi.spyOn(namespace, 'name')` on a namespace import swaps an export of a
 * module the same way, and `vi.stubGlobal` and a spy on `globalThis` swap a
 * global under the code. Both are reported with the module mocks.
 *
 * The framework object is recognised by what it denotes: `vi`, `jest` and
 * `mock` from the test globals, and the same names imported from `vitest`,
 * `@jest/globals` and `bun:test` under any local name or read off a namespace
 * import of that module. A binding of one's own
 * that happens to be called `vi` is left alone, and `vi['mock']` is the same
 * call as `vi.mock`.
 */
export const noModuleMocking: Rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Pass a dependency in instead of mocking its module',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-module-mocking.md',
    },
    schema: [],
    messages: {
      namespaceSpy:
        '`{{call}}` on the namespace `{{namespace}}` swaps an export of a module under the code, so the test runs a graph the app never assembles. Pass the dependency in instead, as an argument or in an options object, and hand the test a value it controls.',
      globalStub:
        '`{{call}}` swaps a global under the code, so the test runs a program the app never runs. Pass the dependency in instead: an options object with the clock, the HTTP client or the storage, and hand the test a value it controls.',
      moduleMock:
        '`{{call}}` replaces a whole module with a framework stand-in, so the test runs a graph the app never assembles. Pass the dependency in instead: take it as an argument, build the client from an injected `fetch`, or make the store the test needs. Then the stand-in is a value the test controls and the code runs as it does in the app.',
    },
  },
  create(context) {
    const { sourceCode } = context

    /** The import specifiers that bind an identifier, beside the module that each one names. */
    function importsOf(node: Identifier): { specifier: ESTree.Node; source: string }[] {
      return (variableFor(sourceCode, node)?.defs ?? []).flatMap((def) =>
        def.type === 'ImportBinding' && def.parent?.type === 'ImportDeclaration' ? [{ specifier: def.node, source: def.parent.source.value }] : [],
      )
    }

    /**
     * The framework object an expression denotes, and the spelling of it for a
     * message: a global, a named import under any local name, or a member of a
     * namespace import of the framework module.
     */
    function frameworkOf(node: ESTree.Expression): { name: string; path: string } | undefined {
      if (node.type === 'Identifier') {
        if (isGlobalIdentifier(sourceCode, node)) return Object.hasOwn(FRAMEWORKS, node.name) ? { name: node.name, path: node.name } : undefined
        for (const { specifier, source } of importsOf(node)) {
          if (specifier.type !== 'ImportSpecifier') continue
          const name = exportedName(specifier.imported)
          if (Object.hasOwn(FRAMEWORKS, name) && source === FRAMEWORKS[name].source) return { name, path: node.name }
        }
        return undefined
      }
      if (node.type !== 'MemberExpression' || node.object.type !== 'Identifier') return undefined
      const name = staticMemberName(node)
      if (name === undefined || !Object.hasOwn(FRAMEWORKS, name)) return undefined
      const namespace = node.object
      const imported = importsOf(namespace).some(({ specifier, source }) => specifier.type === 'ImportNamespaceSpecifier' && source === FRAMEWORKS[name].source)
      return imported ? { name, path: `${namespace.name}.${name}` } : undefined
    }

    return {
      CallExpression(node) {
        const { callee } = node
        if (callee.type !== 'MemberExpression') return
        const framework = frameworkOf(callee.object)
        if (framework === undefined) return
        const method = staticMemberName(callee)
        if (method === undefined) return
        const call = `${framework.path}.${method}`
        if (FRAMEWORKS[framework.name].methods.has(method)) {
          context.report({ node, messageId: 'moduleMock', data: { call } })
          return
        }
        if (method === 'stubGlobal') {
          context.report({ node, messageId: 'globalStub', data: { call } })
          return
        }
        if (method !== 'spyOn' || node.arguments.length === 0) return
        const [target] = node.arguments
        if (target.type !== 'Identifier') return
        if (isGlobalIdentifier(sourceCode, target) && GLOBAL_OBJECTS.has(target.name)) {
          context.report({ node, messageId: 'globalStub', data: { call } })
        } else if (importsOf(target).some(({ specifier }) => specifier.type === 'ImportNamespaceSpecifier')) {
          context.report({ node, messageId: 'namespaceSpy', data: { call, namespace: target.name } })
        }
      },
    }
  },
}
