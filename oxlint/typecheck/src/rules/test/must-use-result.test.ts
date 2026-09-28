import { mustUseResult } from '../must-use-result.ts'
import { createRuleTester } from './rule-tester.ts'

// The cases of the upstream test of @ninoseki/eslint-plugin-neverthrow 0.3.2
// first, then the cases of the inflexa subsystems. The fixture folder declares
// neverthrow and the helpers of the upstream test as globals.
const MUST_USE = { messageId: 'mustUseResult' }

/** The functions of the inflexa cases: producers of a Result, a consumer, and the callbacks of a chain. */
const inflexa = `
declare function load(): Result<number, Error>
declare function loadAsync(): ResultAsync<number, Error>
declare function check(): Result<number, Error>
declare function unwrapOrThrow<T>(result: Result<T, unknown>): T
declare function passGate(result: Result<unknown, unknown>): void
declare const recover: (error: Error) => Result<number, Error>
declare const f: (value: number) => number
declare const g: (error: Error) => Error
declare const cond: boolean
`

const consumers = { consumers: ['unwrapOrThrow', 'passGate'] }

createRuleTester().run('must-use-result', mustUseResult, {
  valid: [
    // call unwrapOr
    `const result = getResult()\nresult.unwrapOr()`,
    // call unwrapOr after some methods
    `const result = getResult()\nresult.map(() => {}).unwrapOr('')`,
    // Call match
    `const result = getResult()\nresult.match(() => {}, () => {})`,
    // Return result from function
    `function main() {\n  return getResult().map(() => {})\n}`,
    // Return result from an arrow function
    `const main = () => getResult().map(() => {})`,
    // Call a normal function
    `getNormal()`,
    // Await result handled properly
    `(await getResultAsync()).unwrapOr(5);\nconst res1 = (await getResultAsync()).unwrapOr(5);\nconst res2 = await getResultAsync();\nres2.unwrapOr(5);`,
    // Await Promise<Result> handled properly
    `(await getPromiseResult()).unwrapOr(5);\nconst res3 = await getPromiseResult();\nres3.unwrapOr(5);`,
    // Return an awaited Promise<Result>
    `async function main() {\n  return await getPromiseResult()\n}`,
    // Call isOk
    `const result = getResult()\nif (result.isOk()) {}`,
    // Call isErr
    `const result = getResult()\nif (!result.isErr()) {}`,
    // Call _unsafeUnwrapErr
    `const result = getResult()\nresult._unsafeUnwrapErr()`,
    // pass results into combine and handle the combined result
    `const result1 = getResult()\nconst result2 = getResult()\nconst result3 = getResult()\nResult.combine([result1, result2, result3]).unwrapOr('')`,
    // pass inline results into combine and handle the combined result
    `Result.combine([getResult(), getResult()]).match(() => {}, () => {})`,
    // pass async results into ResultAsync.combine and handle the combined result
    `const asyncRes1 = getResultAsync()\nconst asyncRes2 = getResultAsync()\nResultAsync.combine([asyncRes1, asyncRes2]).match(() => {}, () => {})`,
    // safeTry with yield* propagates Result errors
    `declare const mightError: () => Result<number, string>\n\nfunction consume(): Result<number, string> {\n  return safeTry(function*() {\n    const value = yield* mightError()\n    return ok(value)\n  })\n}`,
    // class field initializers are excluded: the rule cannot follow `this.r` to its uses
    `class A {\n  r = getResult()\n  static s = getResult()\n\n  m() {\n    return this.r.unwrapOr('')\n  }\n}`,
    // Upstream reports a read of `isOk` without a call. The inflexa extension
    // counts that read as a use, and tsc reports the condition as TS2774.
    `const res = getResult();\nif (res.isOk) {}`,

    // A conditional of two Results, returned or held in a variable that a handled call reads.
    `${inflexa}function pick() {\n  return cond ? ok(1) : err('e')\n}`,
    `${inflexa}const r = cond ? ok(1) : err('e'); r.unwrapOr(0)`,
    // An arrow function whose body passes the Result on, as `isReturned` of upstream decides.
    `const run = () => externalFunction(getResult())`,
    // The checks and the properties that the inflexa subsystems read.
    `const result = getResult()\nresult.isOk()`,
    `const result = getResult()\nresult.isErr()`,
    `const result = getResult()\nresult.error`,
    `const result = getResult()\nresult.value`,
    `const result = getResult()\nresult.isOk`,
    `const result = getResult()\nresult.isErr`,
    `getResult().isOk()`,
    `getResult().value`,
    // The consumers of the option, through the wrappers that forward the same Result.
    { code: `${inflexa}unwrapOrThrow(await loadAsync())`, options: consumers },
    { code: `${inflexa}unwrapOrThrow(load() as Result<number, Error>)`, options: consumers },
    { code: `${inflexa}unwrapOrThrow(load()!)`, options: consumers },
    { code: `${inflexa}load()?.match(f, g)` },
    { code: `${inflexa}const r = load()\nunwrapOrThrow(r)`, options: consumers },
    // `_unsafeUnwrapErr` after `await`, the idiom of a test that expects an Err.
    `${inflexa}(await loadAsync())._unsafeUnwrapErr()`,
    // A consumer after a chain of transforms.
    { code: `${inflexa}unwrapOrThrow(load().orElse(recover).map(f))\npassGate(check().mapErr(g))`, options: consumers },
  ],
  invalid: [
    // only assignment: reported at the expression that gives the value
    { code: `const result = getResult()`, errors: [{ ...MUST_USE, line: 1, column: 16 }] },
    // Call map for result
    {
      code: `const result = getResult();\nresult.map(() => {})`,
      errors: [
        { ...MUST_USE, line: 1, column: 16 },
        { ...MUST_USE, line: 2, column: 1 },
      ],
    },
    // only call
    { code: `getResult()`, errors: [{ ...MUST_USE, line: 1, column: 1 }] },
    // call external function
    { code: `const v = getResult()\nexternalFunction(v)`, errors: [{ ...MUST_USE, line: 1, column: 11 }] },
    // made call from object
    { code: `obj.get()`, errors: [MUST_USE] },
    // none of the handle methods is called
    { code: `getResult().unwrapOr`, errors: [MUST_USE] },
    // called inside a function
    { code: `function main() {\n  getResult().map(() => {})\n}`, errors: [MUST_USE, MUST_USE] },
    // Await result is not handled properly
    {
      code: `const res = await getResultAsync();\nconst res1 = await getResultAsync();\nres1.unwrapOr;\n\nawait getResultAsync();`,
      errors: [
        { ...MUST_USE, line: 1, column: 13 },
        { ...MUST_USE, line: 2, column: 14 },
        { ...MUST_USE, line: 5, column: 1 },
      ],
    },
    // Await Promise<Result> is not handled properly
    { code: `const res = await getPromiseResult();\nconst res1 = await getPromiseResult();\nres1.unwrapOr;\n\nawait getPromiseResult();`, errors: [MUST_USE, MUST_USE, MUST_USE] },
    // combine result itself is not handled
    { code: `const result1 = getResult()\nconst result2 = getResult()\nResult.combine([result1, result2])`, errors: [{ ...MUST_USE, line: 3, column: 1 }] },
    // ResultAsync.combine result itself is not handled
    { code: `const asyncRes1 = getResultAsync()\nconst asyncRes2 = getResultAsync()\nResultAsync.combine([asyncRes1, asyncRes2])`, errors: [MUST_USE] },
    // safeTry without yield* should still be handled explicitly
    {
      code: `declare const mightError: () => Result<number, string>\n\nfunction consume(): Result<number, string> {\n  return safeTry(function*() {\n    mightError()\n    return ok(1)\n  })\n}`,
      errors: [{ ...MUST_USE, line: 5, column: 5 }],
    },
    // safeTry with yield (not yield*) should still be handled explicitly
    {
      code: `declare const mightError: () => Result<number, string>\n\nfunction consume(): Result<number, string> {\n  return safeTry(function*() {\n    yield mightError()\n    return ok(1)\n  })\n}`,
      errors: [{ ...MUST_USE, line: 5, column: 11 }],
    },

    // A statement that drops a ResultAsync behind `await`.
    { code: `await getResultAsync()`, errors: [MUST_USE] },
    // Without the option, no function consumes a Result.
    { code: `${inflexa}unwrapOrThrow(load().orElse(recover).map(f))\npassGate(check().mapErr(g))`, errors: [MUST_USE, MUST_USE, MUST_USE, MUST_USE, MUST_USE] },
    { code: `${inflexa}const r = load()\nunwrapOrThrow(r)`, errors: [MUST_USE] },
    // A function that no option names does not consume the Result.
    { code: `${inflexa}const r = load()\nexternalFunction(r)`, options: consumers, errors: [MUST_USE] },
  ],
})
