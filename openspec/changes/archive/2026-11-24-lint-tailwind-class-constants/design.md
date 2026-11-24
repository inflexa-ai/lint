# Design

## Context

See proposal.md - Why. The facts below come from eslint-plugin-better-tailwindcss 4.7.0 in the workspace, and from a probe with oxlint 1.85.0 in `tmp/claude/tw-probe/`.

- The plugin merges its settings over its default options, thus a `selectors` setting replaces each default selector (`lib/utils/rule.js`, `getOptions`).
- `getDefaultSelectors()` of the export `./defaults` returns the default selectors. The peer range of the React package starts at 4.7.0, which has the export.
- The name of a selector is a regular expression that must match the full name: `matchesName` compares the match with the name (`lib/utils/utils.js`). Thus `_CLASSES$` matches no name, and `^.*_CLASSES$` matches each name with the suffix.
- The default variable selectors match a string value only. Thus `const styles = { a: '…' }` gets no report.
- A probe with the selector `{ kind: 'variable', name: '^.*_CLASSES$', match: [{ type: 'strings' }, { type: 'objectValues' }] }` reports the classes of a string, a template, a conditional, a nested object, an array in an object, an object with `as const`, and an object with `satisfies`.
- The default callee names are `cc`, `clb`, `clsx`, `cn`, `cnb`, `ctl`, `cva`, `cx`, `dcnb`, `objstr`, `tv`, `twJoin` and `twMerge`. The default attribute names for JSX are `class` and `className`.

## Goals / Non-Goals

**Goals:**

- The Tailwind rules lint each class in a module constant that a component uses.
- A constant that holds classes cannot hide from the Tailwind rules through its name.

**Non-Goals:**

- Follow an imported constant to the module that declares it. The rule reads one file. The declaring module does not use the constant in a class position, thus the rule does not report it there either. The document states this limit.
- An option for the suffix. The presets fix their other conventions in the same way.
- Read the selectors from the settings in the rule. A rule that runs without the `tailwind` option then has no class positions.

## Decisions

- **The selector name is `^.*_CLASSES$`.** The plugin compares the full match with the name, thus the pattern must cover the full name.
- **`react()` loads the defaults only when `tailwind` is set.** The plugin is an optional peer. `react()` loads `eslint-plugin-better-tailwindcss/defaults` through `createRequire`, as it loads React Doctor. Alternative: a copy of the default selectors in this package. That copy can drift from the installed plugin.
- **The rule reports the declaration, one time for each constant.** The fix is a rename at the declaration. A report at each use gives a constant with ten uses ten reports for one fix.
- **The class positions of the rule:** the value of a JSX attribute `class` or `className`, and each argument of a call of a default callee name. In a position, the rule follows a conditional, a logical expression, a template, an array and a spread. A member expression counts through its root, thus `LOOKS[look].course` is a use of `LOOKS`. A call in a position is a position of its own when its callee is a class function, and the rule does not follow other calls.
- **The constant:** the identifier resolves to a `const` of the module scope, and its value, after `as`, `satisfies`, `!` and `<T>`, is a string literal, a template literal or an object literal. A local `const` in a function is out of scope, because the plugin lints only by name, and a rename of each local is noise.
- **A default name passes only with a string or template value.** `className`, `classNames`, `classes`, `style` and `styles` have default selectors that match strings only. Thus `const styles = { … }` gets a report with the new name `STYLES_CLASSES`.
- **The new name** is the old name in upper snake case with `_CLASSES` after it. `RAIL_BUTTON` becomes `RAIL_BUTTON_CLASSES`, and `railButton` becomes `RAIL_BUTTON_CLASSES`.
- **The callee names are a fixed set in the rule.** The rule cannot import the optional peer. The test of the preset compares the set with `getDefaultSelectors()`, thus a new default callee of the plugin fails the test.

## Risks / Trade-offs

- [A repository with the `tailwind` option gets new reports after the upgrade] → Each report gives the new name, and the rename is the fix.
- [A constant that holds no classes, for example a string for a `data-` value, goes into `cn()`] → The rule reports it. A string in `cn()` is a class by the contract of `cn`.
