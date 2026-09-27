## ADDED Requirements

### Requirement: A function outside the tests declares its return type

`typescript()` SHALL turn on `typescript/explicit-function-return-type` for each TypeScript file, with `allowExpressions: true` and `allowTypedFunctionExpressions: true`. It SHALL turn the rule off for the globs of the `tests` option. `react()` SHALL carry the same rule, because it builds on `typescript()`.

#### Scenario: An exported function with an inferred return type

- **WHEN** oxlint lints `src/total.ts` that holds `export function total(items: Item[]) { return items.length }` with the configuration of `typescript()`
- **THEN** `typescript/explicit-function-return-type` reports the function

#### Scenario: A callback and a typed function expression

- **WHEN** oxlint lints `const prices = items.map((item) => item.price)` and `const handler: Handler = (event) => event.id`
- **THEN** `typescript/explicit-function-return-type` reports neither function

#### Scenario: A helper in a test file

- **WHEN** oxlint lints `src/total.test.ts` that holds `const make = (n: number) => ({ n })`, and `tests` keeps its default
- **THEN** `typescript/explicit-function-return-type` reports nothing

## MODIFIED Requirements

### Requirement: The rule set names each rule

The factory SHALL turn off the `correctness` category and name each rule. The rule set SHALL be the set that the ESLint factories turned on, plus `typescript/explicit-function-return-type`, except `no-octal`, `react-hooks/config`, `react-hooks/gating`, the `allowCompoundComponents` option of `only-export-components`, the `errorClassNames` option of `preserve-caught-error`, and the typed rules of the `typed-rules` capability.

#### Scenario: Only the named rules run

- **WHEN** oxlint lints a file with the configuration of `typescript()`
- **THEN** each rule that reports is a rule that the configuration names
