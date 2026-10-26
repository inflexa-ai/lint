import type { ESTree, Rule } from '@oxlint/plugins'
import { staticMemberName } from '../helpers/static-names.ts'

const REDUCERS = new Set(['reduce', 'reduceRight'])

const LOOPS = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement'])

/** The name of the accumulator that the copy reads, when the call copies one: `acc.concat(…)` or `Object.assign({}, acc, …)`. */
function copiedName(call: ESTree.CallExpression): { name: string; form: string } | undefined {
  const { callee } = call
  if (callee.type !== 'MemberExpression') return undefined
  const method = staticMemberName(callee)
  if (method === 'concat' && callee.object.type === 'Identifier') return { name: callee.object.name, form: `${callee.object.name}.concat(…)` }
  if (method !== 'assign' || callee.object.type !== 'Identifier' || callee.object.name !== 'Object' || call.arguments.length < 2) return undefined
  const [target, source] = call.arguments
  if (target.type === 'ObjectExpression' && target.properties.length === 0 && source.type === 'Identifier') {
    return { name: source.name, form: `Object.assign({}, ${source.name}, …)` }
  }
  return undefined
}

/** The name of the first parameter of the reducer that holds the node, or `undefined` outside of a reducer. */
function accumulatorOf(node: ESTree.Node): string | undefined {
  for (let current: ESTree.Node | null = node.parent; current !== null; current = current.parent) {
    if (current.type !== 'ArrowFunctionExpression' && current.type !== 'FunctionExpression') continue
    const call = current.parent
    if (call.type !== 'CallExpression' || call.arguments[0] !== current || call.callee.type !== 'MemberExpression') return undefined
    if (current.params.length === 0) return undefined
    const [accumulator] = current.params
    return REDUCERS.has(staticMemberName(call.callee) ?? '') && accumulator.type === 'Identifier' ? accumulator.name : undefined
  }
  return undefined
}

/** Whether the node sits in the body of a loop, inside the same function. */
function isInLoop(node: ESTree.Node): boolean {
  for (let current: ESTree.Node | null = node.parent; current !== null; current = current.parent) {
    if (LOOPS.has(current.type)) return true
    if (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression' || current.type === 'FunctionDeclaration') return false
  }
  return false
}

/**
 * `acc.concat([item])` and `Object.assign({}, acc, entry)` copy the whole
 * accumulator on each pass, the same as `{ ...acc }` does, so a reduce over n
 * items does n² work. `oxc/no-accumulating-spread` reports the spread form, and
 * this rule reports the two copies that it does not read.
 */
export const noAccumulatingCopy: Rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Add to an accumulator in place instead of copying it on each pass',
      url: 'https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-accumulating-copy.md',
    },
    schema: [],
    messages: {
      accumulatingCopy:
        '`{{form}}` copies the whole accumulator on each pass, so the work grows with the square of the input. Add to the accumulator in place (`acc.push(item)`, `acc[key] = value`), or build the result in one step with `flatMap`, `Object.fromEntries` or `new Map(entries)`.',
    },
  },
  create(context) {
    return {
      CallExpression(call) {
        const copy = copiedName(call)
        if (copy === undefined) return
        if (accumulatorOf(call) === copy.name) {
          context.report({ node: call, messageId: 'accumulatingCopy', data: { form: copy.form } })
          return
        }
        // `result = result.concat(…)` inside a loop is the same copy without a reducer.
        const { parent } = call
        const reassigns = parent.type === 'AssignmentExpression' && parent.right === call && parent.left.type === 'Identifier' && parent.left.name === copy.name
        if (reassigns && isInLoop(call)) context.report({ node: call, messageId: 'accumulatingCopy', data: { form: copy.form } })
      },
    }
  },
}
