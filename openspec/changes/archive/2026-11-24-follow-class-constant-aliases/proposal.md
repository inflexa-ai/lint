# Proposal

## Why

ubb-tutor_client found that `class-constant-name` 0.10.0 does not see a class map that a component reads through a local alias. In `const classes = LOOKS[look]` and then `cn(classes.course)`, the root `classes` is a local `const`, thus the rule stops there (`oxlint/react/src/rules/class-constant-name.ts`). The module constant `LOOKS` keeps classes that no Tailwind rule reads.

The same consumer found that the rule does not see an array of objects whose fields go into a class position, for example `PROMPTS.map(({ tone }) => cn(tone))`. Such an object often holds values that are not classes. A `_CLASSES` name then makes the plugin lint each of its strings as a class. Thus the rule stays the same for this form, and the document gives the correct form.

## What Changes

- `class-constant-name` follows a local `const` to its initializer, also through destructuring, and reports the module constant at its declaration. It does not follow a `let`.
- The document of the rule states the alias rule, and names the array of objects as a form that the rule does not report, with the correct form: a `_CLASSES` object with the item as the key.
- The shared packages go to 0.10.1.

## Capabilities

### Modified Capabilities

- `class-constant-name`: the rule follows a local `const` alias.

## Impact

- Code: `oxlint/react/src/rules/class-constant-name.ts`.
- Tests: `oxlint/react/src/rules/test/class-constant-name.test.ts`.
- Documents: `docs/rules/class-constant-name.md`.
- Consumers: a repository can get new reports for a module constant that it reads through a local alias.
