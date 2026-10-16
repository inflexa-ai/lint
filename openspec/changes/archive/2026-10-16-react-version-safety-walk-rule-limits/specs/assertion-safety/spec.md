# Spec Delta

## Purpose

Fix where a `SAFETY:` comment answers for a type assertion under `require-assertion-safety`, so that the comment sits where a person reads the statement and the rule message states that place.

## ADDED Requirements

### Requirement: A SAFETY comment answers for the assertions of the statement that holds them

`require-assertion-safety` SHALL accept an assertion when a comment that holds `SAFETY:` ends before the assertion and lies between a node on the path from the assertion up to its holding statement and the token before that node. The holding statement is the nearest ancestor that the program, a block, a static block, a `switch` case, a module block or a class body holds. A statement in a body without braces belongs to the `if`, loop or labeled statement that holds it.

#### Scenario: A comment above a braceless if body

- **WHEN** a file holds `// SAFETY: the guard narrows it` on the line above `if (isNode(value)) return value as ElementNode`
- **THEN** the rule reports nothing

#### Scenario: A comment above an if and else-if chain

- **WHEN** a file holds `// SAFETY: each branch narrows it` above `if (a) f()` and the next line is `else if (b) g(value as ElementNode)`
- **THEN** the rule reports nothing

#### Scenario: A comment above a braceless loop body

- **WHEN** a file holds `// SAFETY: each entry is a number` above `for (const v of values) total += v as number`
- **THEN** the rule reports nothing

#### Scenario: A comment above an exported declaration

- **WHEN** a file holds `// SAFETY: the runtime built it` above `export const el = ref.current as HTMLDivElement`
- **THEN** the rule reports nothing

#### Scenario: A comment above an if does not reach into its block

- **WHEN** a function holds `// SAFETY: the guard narrows it` above `if (isNode(value)) {`, and the block holds `return value as ElementNode` with no comment above it
- **THEN** the rule reports the assertion

#### Scenario: A comment above a function does not reach a cast in an if test

- **WHEN** a file holds `// SAFETY: the flag is a boolean` above `function f() {`, and the body holds `if (flag as boolean) {}`
- **THEN** the rule reports the assertion

#### Scenario: Existing placements keep their result

- **WHEN** the rule lints the valid and invalid cases of its test file from before this change
- **THEN** each valid case reports nothing, and each invalid case reports the same errors as before

### Requirement: The message and the document state the placement

The message of `require-assertion-safety` SHALL tell the developer to write the `SAFETY:` comment above the statement that holds the assertion, or before the assertion on its line, and SHALL state that a statement in a body without braces belongs to its `if` or loop. `docs/rules/require-assertion-safety.md` SHALL describe the same placement, with an example of a braceless `if` body and of a block.

#### Scenario: A developer reads the message of a report

- **WHEN** the rule reports an assertion
- **THEN** the message names the statement that holds the assertion as the place of the comment, and names the `if` or loop of a body without braces

#### Scenario: A developer reads the rule document

- **WHEN** a developer opens `docs/rules/require-assertion-safety.md`
- **THEN** the document gives the placement rule, an example of a comment above a braceless `if` body, and an example of a comment inside a block
