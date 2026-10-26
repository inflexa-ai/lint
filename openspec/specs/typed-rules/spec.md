# typed-rules Specification

## Purpose

The rules that read types run in `inflexa-typecheck` on the program of TypeScript 7, because oxlint gives a JS plugin no type information, and each typed rule reads the checker of its project instead of a name.

## Requirements

### Requirement: inflexa-typecheck runs the typed rules

`@inflexa-ai/typecheck` SHALL hold the typed rules `must-use-result`, `require-abort-signal`, `no-generated-empty-object-type` and `no-lookup-in-loop`. The `./typecheck` entry of `@inflexa-ai/oxlint-plugin-react` SHALL export a typecheck plugin named `@inflexa-ai/react` with the rules `no-inline-query-key` and `no-void-query-fn`. `typecheck()` SHALL turn on `no-generated-empty-object-type` and `no-lookup-in-loop` by default, and a repository SHALL turn on each other typed rule in its own overrides. No oxlint plugin of this repository SHALL hold a typed rule. No package of this repository SHALL have an `./eslint` entry or depend on `eslint`, `typescript-eslint` or a package of `@typescript-eslint/`. The React package SHALL name `@inflexa-ai/typecheck` at the shared version as an optional peer dependency, which only its `./typecheck` entry needs, and SHALL declare no `typescript` peer. The typed rules of the React package SHALL import the modules of TypeScript 7 only through `@inflexa-ai/typecheck`.

#### Scenario: A repository runs a typed rule

- **WHEN** a repository turns on `require-abort-signal` with `declaredIn: ['/src/api/']` for `src/**` in `typecheck.config.ts`, and a call into the client carries no `signal`
- **THEN** `inflexa-typecheck` reports the call

#### Scenario: No package has an ESLint entry

- **WHEN** a reader opens the manifests of the packages under `oxlint/`
- **THEN** no manifest exports `./eslint`, and no manifest depends on `eslint`, `typescript-eslint` or a package of `@typescript-eslint/`

#### Scenario: No manifest names TypeScript 7

- **WHEN** a reader opens the `peerDependencies` of each manifest under `oxlint/`
- **THEN** no manifest names `typescript`, and the typed rules of the React package import `@inflexa-ai/typecheck/unstable/ast` and `@inflexa-ai/typecheck/unstable/sync`

### Requirement: must-use-result reports a Result that nothing uses

`must-use-result` SHALL look at each call, `new` and `await` expression whose type is a neverthrow `Result` or `ResultAsync`, and SHALL report it when the program does not use the value. A type is a `Result` when its apparent type, or a member of its union, has each of `mapErr`, `map`, `andThen`, `orElse`, `match` and `unwrapOr`. The rule SHALL treat a value as used when one of these holds, and SHALL report it in each other case:

- A call of `match`, `unwrapOr`, `_unsafeUnwrap` or `_unsafeUnwrapErr` on it, directly or at the end of a chain of method calls on it.
- A call of `isOk` or `isErr` on it, directly or at the end of a chain of method calls on it, when the call is not the expression of an expression statement.
- A read of its property `error`, `value`, `isOk` or `isErr`.
- An ancestor up to the nearest block or source file is a `return` statement or an arrow function, as `isReturned` of upstream decides. Thus `return cond ? ok(1) : err('e')` and `(x) => f(getResult())` use the value.
- A `yield*` of it inside the generator function that `safeTry` receives.
- An element of an array that goes directly into a call that gives a `Result`, for example `Result.combine([a, b])`.
- An argument of a call whose callee is an identifier that the option `consumers` names, directly or through a chain of `orElse`, `map`, `mapErr` or `andThen` calls.
- The nearest variable declaration among its ancestors up to the nearest block has an identifier name and an initializer that is a `Result`, and a reference of that variable uses the value by one of the rules above, as `getAssignation` and `handleAssignation` of upstream decide.
- The nearest assignment `name = <Result>` among its ancestors up to the nearest block, which the walk reaches from its right side, has an identifier on the left, and a reference of that variable uses the value by one of the rules above. Upstream follows only a declaration. The walk SHALL follow each variable once on its path, thus `r = r.map(f)` ends.

The rule SHALL step through parentheses, `await`, `as`, `satisfies`, `!` and `?.` between the value and its use. As upstream does, it SHALL leave out an expression whose parent is a type assertion (`as`, `<T>`) or a non-null assertion, and an initializer of a class field. Unlike upstream, it SHALL examine an expression under `satisfies`, because `satisfies` does not change the value. The rule SHALL report an unused value at the expression that gives it, also when a variable holds the value. Its message SHALL name `match`, `unwrapOr`, and a branch on `isOk()` or `isErr()`, and SHALL NOT name `_unsafeUnwrap`. The option `consumers` SHALL default to an empty list.

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

- **WHEN** a file reads `if (result.isOk()) {}`, `const failed = result.isErr()`, `result.error`, `result.value`, `result.isOk` or `result.isErr`
- **THEN** the rule treats `result` as used

#### Scenario: A check whose answer no code reads

- **WHEN** a statement is `getResult().isOk()`, or a file holds `const result = getResult(); result.isErr()`
- **THEN** the rule reports `getResult()`

#### Scenario: satisfies

- **WHEN** a statement is `load() satisfies Result<number, Error>`
- **THEN** the rule reports `load()`, and it reports nothing for `(load() satisfies Result<number, Error>).unwrapOr(0)`

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

`no-inline-query-key` SHALL also follow an identifier in a key position, or in a filters or options position, to its `const` declaration in the same file. It SHALL report the key when the initializer is an array literal, or an object literal whose own `queryKey` is an array literal. The rule SHALL read a spread of an array literal in the arguments as its elements, in their positions.

#### Scenario: A key in a local const

- **WHEN** a file holds `const key = ['todos']` and then `client.invalidateQueries({ queryKey: key })`, or `const filters = { queryKey: ['todos'] }` and then `client.invalidateQueries(filters)`
- **THEN** the rule reports the array literal, and it reports nothing for `let key = ['todos']`

#### Scenario: A spread of an array literal

- **WHEN** a file holds `client.invalidateQueries(...[{ queryKey: ['todos'] }] as const)`
- **THEN** the rule reports the array literal of the key

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

### Requirement: no-lookup-in-loop reports a scan of an array on each pass of a loop

`no-lookup-in-loop` SHALL report a call of `includes`, `indexOf` or `lastIndexOf`, and a call of `find`, `findIndex`, `findLast`, `findLastIndex`, `some` or `filter` whose callback gives one `===` or `==` comparison, when the checker types the receiver as an array or a tuple, the receiver is an identifier, `this`, or a chain of property reads from one, and that root is declared outside of the nearest repeating context of the call. A repeating context SHALL be the body of a `for`, `for...of`, `for...in`, `while` or `do` statement, the condition of a `for`, `while` or `do` statement, the update of a `for` statement, or the callback of an array method that calls it for each element.

The rule SHALL also report a `for...of` statement over an array or a tuple when its receiver obeys the same conditions, and its body, outside of a nested function, holds a `===` or `==` comparison. One side of that comparison SHALL be a name that the statement binds for each element, or a chain of property reads from that name. The other side SHALL not read such a name.

#### Scenario: A search by hand inside a loop

- **WHEN** a file holds `for (const row of rows) for (const s of selected) if (s === row.id) break` and `selected` is a `string[]` declared outside of the outer loop
- **THEN** the rule reports the inner `for...of` statement

#### Scenario: An inner loop with no equality to a value

- **WHEN** a file holds `for (const row of rows) for (const user of users) if (user.name.startsWith(row.name)) break`, or `for (const row of rows) for (const tag of row.tags) if (tag === 'urgent') break`
- **THEN** the rule reports nothing

#### Scenario: A membership test inside a callback

- **WHEN** a file holds `const kept = rows.filter((row) => selected.includes(row.id))` and `selected` is a `string[]` declared outside of the callback
- **THEN** the rule reports `selected.includes(row.id)`

#### Scenario: A keyed find inside a loop

- **WHEN** a file holds `for (const row of rows) users.find((user) => user.id === row.userId)`
- **THEN** the rule reports the call of `find`

#### Scenario: A string method and an array of the element

- **WHEN** a file holds `for (const row of rows) row.name.includes(name)` and `for (const row of rows) row.tags.includes('urgent')`
- **THEN** the rule reports nothing

#### Scenario: A predicate with no keyed form

- **WHEN** a file holds `for (const row of rows) users.find((user) => user.name.startsWith(row.name))`
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
