# typed-rules Specification

## Purpose

The rules that read types run in `inflexa-typecheck` on the program of TypeScript 7, because oxlint gives a JS plugin no type information, and each typed rule reads the checker of its project instead of a name.

## Requirements

### Requirement: inflexa-typecheck runs the typed rules

`@inflexa-ai/typecheck` SHALL hold the typed rules `must-use-result`, `require-abort-signal` and `no-generated-empty-object-type`. The `./typecheck` entry of `@inflexa-ai/oxlint-plugin-react` SHALL export a typecheck plugin named `@inflexa-ai/react` with the rules `no-inline-query-key` and `no-void-query-fn`. `typecheck()` SHALL turn on `no-generated-empty-object-type` by default, and a repository SHALL turn on each other typed rule in its own overrides. No oxlint plugin of this repository SHALL hold a typed rule. No package of this repository SHALL have an `./eslint` entry or depend on `eslint`, `typescript-eslint` or a package of `@typescript-eslint/`. The React package SHALL name `@inflexa-ai/typecheck` at the shared version and `typescript` at the exact version of `@inflexa-ai/typecheck` as optional peer dependencies, which only its `./typecheck` entry needs.

#### Scenario: A repository runs a typed rule

- **WHEN** a repository turns on `require-abort-signal` with `declaredIn: ['/src/api/']` for `src/**` in `typecheck.config.ts`, and a call into the client carries no `signal`
- **THEN** `inflexa-typecheck` reports the call

#### Scenario: No package has an ESLint entry

- **WHEN** a reader opens the manifests of the packages under `oxlint/`
- **THEN** no manifest exports `./eslint`, and no manifest depends on `eslint`, `typescript-eslint` or a package of `@typescript-eslint/`

### Requirement: must-use-result reports a Result that nothing uses

`must-use-result` SHALL look at each call, `new` and `await` expression whose type is a neverthrow `Result` or `ResultAsync`, and SHALL report it when the program does not use the value. A type is a `Result` when its apparent type, or a member of its union, has each of `mapErr`, `map`, `andThen`, `orElse`, `match` and `unwrapOr`. The rule SHALL treat a value as used when one of these holds, and SHALL report it in each other case:

- A call of `match`, `unwrapOr`, `_unsafeUnwrap`, `_unsafeUnwrapErr`, `isOk` or `isErr` on it, directly or at the end of a chain of method calls on it.
- A read of its property `error`, `value`, `isOk` or `isErr`.
- An ancestor up to the nearest block or source file is a `return` statement or an arrow function, as `isReturned` of upstream decides. Thus `return cond ? ok(1) : err('e')` and `(x) => f(getResult())` use the value.
- A `yield*` of it inside the generator function that `safeTry` receives.
- An element of an array that goes directly into a call that gives a `Result`, for example `Result.combine([a, b])`.
- An argument of a call whose callee is an identifier that the option `consumers` names, directly or through a chain of `orElse`, `map`, `mapErr` or `andThen` calls.
- The nearest variable declaration among its ancestors up to the nearest block has an identifier name and an initializer that is a `Result`, and a reference of that variable uses the value by one of the rules above, as `getAssignation` and `handleAssignation` of upstream decide.
- The nearest assignment `name = <Result>` among its ancestors up to the nearest block, which the walk reaches from its right side, has an identifier on the left, and a reference of that variable uses the value by one of the rules above. Upstream follows only a declaration. The walk SHALL follow each variable once on its path, thus `r = r.map(f)` ends.

The rule SHALL step through parentheses, `await`, `as`, `!` and `?.` between the value and its use. As upstream does, it SHALL leave out an expression whose parent is a type assertion (`as`, `satisfies`, `<T>`) or a non-null assertion, and an initializer of a class field. The rule SHALL report an unused value at the expression that gives it, also when a variable holds the value. The option `consumers` SHALL default to an empty list.

#### Scenario: A statement drops a Result

- **WHEN** a statement is `getResult()`, or `await getResultAsync()`, or `obj.get()` where `get` gives a `Result`
- **THEN** the rule reports the statement

#### Scenario: A variable that nothing uses

- **WHEN** a file holds `const result = getResult()` and no other reference of `result`
- **THEN** the rule reports `getResult()`

#### Scenario: A chain that ends in a handled method

- **WHEN** a file holds `getResult().map(() => {}).unwrapOr('')`
- **THEN** the rule reports nothing

#### Scenario: A chain that ends in a transform

- **WHEN** a file holds `const result = getResult(); result.map(() => {})`
- **THEN** the rule reports `getResult()` and `result.map(() => {})`

#### Scenario: A property that is not called

- **WHEN** a file holds `getResult().unwrapOr` as a statement
- **THEN** the rule reports it

#### Scenario: A returned Result

- **WHEN** a function holds `return getResult().map(() => {})` or `return cond ? ok(1) : err('e')`, or an arrow function has `getResult()` as its body
- **THEN** the rule reports nothing

#### Scenario: An assignment to a variable declared earlier

- **WHEN** a function holds `let r: Result<number, Error>`, then `r = await loadLater()` in a `try` block whose `catch` returns, then `if (r.isErr()) return`
- **THEN** the rule reports nothing, and it reports `load()` in `let r: Result<number, Error>; r = load()` when no reference of `r` uses the value

#### Scenario: An assignment that reads its own variable

- **WHEN** a file holds `let r = load(); r = r.map(f); r.unwrapOr(0)`
- **THEN** the rule reports nothing, and the walk ends

#### Scenario: A conditional initializer

- **WHEN** a file holds `const r = cond ? ok(1) : err('e'); r.unwrapOr(0)`
- **THEN** the rule reports nothing

#### Scenario: safeTry

- **WHEN** the generator function of `safeTry` holds `const value = yield* mightError()`
- **THEN** the rule reports nothing, and it reports `mightError()` as a statement or after `yield` without `*`

#### Scenario: combine

- **WHEN** a file holds `Result.combine([result1, result2]).unwrapOr('')`
- **THEN** the rule reports nothing, and without `.unwrapOr('')` it reports the `combine` call

#### Scenario: The checks and the properties of inflexa

- **WHEN** a file reads `result.isOk()`, `result.isErr()`, `result.error`, `result.value`, `result.isOk` or `result.isErr`
- **THEN** the rule treats `result` as used

#### Scenario: A step through a wrapper

- **WHEN** the option `consumers` is `['unwrapOrThrow']`, and a file holds `unwrapOrThrow(await load())`, `unwrapOrThrow(load() as Result<A, E>)`, `unwrapOrThrow(load()!)` and `load()?.match(f, g)`
- **THEN** the rule reports nothing

#### Scenario: _unsafeUnwrapErr after await

- **WHEN** a test holds `(await loadAsync())._unsafeUnwrapErr()`
- **THEN** the rule reports nothing

#### Scenario: A consumer after a chain

- **WHEN** the option `consumers` is `['unwrapOrThrow', 'passGate']`, and a file holds `unwrapOrThrow(load().orElse(recover).map(f))` and `passGate(check().mapErr(g))`
- **THEN** the rule reports nothing, and without the option it reports each call

#### Scenario: A function that is not a consumer

- **WHEN** a file holds `const v = getResult(); externalFunction(v)`
- **THEN** the rule reports `getResult()`

### Requirement: require-abort-signal and no-inline-query-key keep their reports

`require-abort-signal` and `no-inline-query-key` SHALL report the same calls, with the same message ids, data and options, as their ESLint versions reported. Each valid and each invalid case of their ESLint tests SHALL keep its result in the tests of the rule tester of `@inflexa-ai/typecheck`.

#### Scenario: The former cases

- **WHEN** the cases of the former ESLint tests of both rules run in the rule tester of `@inflexa-ai/typecheck`
- **THEN** each valid case reports nothing, and each invalid case reports the same message ids and data as before

### Requirement: no-generated-empty-object-type reports a type operation that gives {}

`no-generated-empty-object-type` SHALL report an intersection type, and a type reference with type arguments whose parent is not an intersection type, when its type or a member of its union is an object type that is not a class or an interface, has no property, no index signature, no call signature and no construct signature, and accepts both `number` and `string`.

#### Scenario: Omit that removes each key

- **WHEN** a file holds `type Rest = Omit<{ a: string }, 'a'>`
- **THEN** the rule reports `Omit<{ a: string }, 'a'>`

#### Scenario: A type that keeps a member

- **WHEN** a file holds `type Both = { a: 1 } & { b: 2 }` and `type Some = Pick<{ a: string; b: number }, 'a'>`
- **THEN** the rule reports nothing

#### Scenario: A mapped type that waits for its type argument

- **WHEN** a generic declaration holds `Record<keyof T, unknown>`
- **THEN** the rule reports nothing

### Requirement: no-void-query-fn reports a query function that gives no value

`@inflexa-ai/react/no-void-query-fn` SHALL report the value of a property named `queryFn` of an object literal, in the property, method and shorthand forms, when the first call signature of its type gives `void` or `undefined`, or a union with `void` or `undefined`, after `await` of a promise.

#### Scenario: An async function that returns nothing

- **WHEN** a file holds `useQuery({ queryKey: key, queryFn: async () => { await load() } })`
- **THEN** the rule reports the function

#### Scenario: A function that gives data

- **WHEN** a file holds `useQuery({ queryKey: key, queryFn: () => fetchTodos() })` and `fetchTodos` gives `Promise<Todo[]>`
- **THEN** the rule reports nothing

#### Scenario: A union with undefined

- **WHEN** the query function gives `Promise<Todo | undefined>`
- **THEN** the rule reports the function
