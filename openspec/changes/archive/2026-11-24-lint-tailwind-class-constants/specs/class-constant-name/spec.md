# Spec Delta

## Purpose

Make a module constant that holds Tailwind classes carry a name that the Tailwind rules of `react()` lint.

## ADDED Requirements

### Requirement: A module constant in a class position ends in _CLASSES

`@inflexa-ai/react/class-constant-name` SHALL report a module `const` when an identifier that resolves to it is in a class position, directly or as the root of a member expression, its value is a string literal, a template literal or an object literal, and its name does not end in `_CLASSES`. A class position is the value of a JSX attribute `class` or `className`, or an argument of a call of `cc`, `clb`, `clsx`, `cn`, `cnb`, `ctl`, `cva`, `cx`, `dcnb`, `objstr`, `tv`, `twJoin` or `twMerge`. In a position, the rule SHALL follow a conditional, a logical expression, a template, an array and a spread. The rule SHALL see the value through `as`, `satisfies`, a non-null assertion and a type assertion. The rule SHALL report each constant one time, at its declaration, and the message SHALL give the name in upper snake case with `_CLASSES` after it. A constant with the name `className`, `classNames`, `classes`, `style` or `styles` and a value that is not an object literal SHALL pass.

#### Scenario: A constant in className

- **WHEN** a file holds `const RAIL_BUTTON = 'flex'` and `<div className={RAIL_BUTTON} />`
- **THEN** the rule reports `RAIL_BUTTON` at its declaration and gives the name `RAIL_BUTTON_CLASSES`

#### Scenario: A constant in cn

- **WHEN** a file holds `const ITEM = 'flex'` and `cn(ITEM, 'gap-2')`
- **THEN** the rule reports `ITEM` and gives the name `ITEM_CLASSES`

#### Scenario: An object map read through a member

- **WHEN** a file holds `const LOOKS = { sidebar: { course: 'h-10' } } as const` and `cn('flex', LOOKS[look].course)`
- **THEN** the rule reports `LOOKS` and gives the name `LOOKS_CLASSES`

#### Scenario: A constant with many uses

- **WHEN** a file holds `const ITEM = 'flex'` and uses it in two `className` attributes
- **THEN** the rule reports `ITEM` one time

#### Scenario: A local constant

- **WHEN** a function holds `const item = 'flex'` and returns `<div className={item} />`
- **THEN** the rule reports nothing

#### Scenario: A name that the plugin lints

- **WHEN** a file holds `const RAIL_CLASSES = 'flex'` or `const classes = 'flex'`, and uses it in `className`
- **THEN** the rule reports nothing

#### Scenario: A default name with an object value

- **WHEN** a file holds `const styles = { a: 'flex' }` and `cn(styles.a)`
- **THEN** the rule reports `styles` and gives the name `STYLES_CLASSES`

#### Scenario: A constant outside a class position

- **WHEN** a file holds `const LABEL = 'Open'` and uses it only in `aria-label={LABEL}` or in a call of a function that is not a class function
- **THEN** the rule reports nothing
