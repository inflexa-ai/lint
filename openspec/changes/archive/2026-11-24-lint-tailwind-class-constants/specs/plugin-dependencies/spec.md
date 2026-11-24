# Spec Delta

## MODIFIED Requirements

### Requirement: The Tailwind plugin loads only when a repository asks for Tailwind

No module of the React package SHALL import `eslint-plugin-better-tailwindcss` at its top level. `react()` SHALL resolve the path of the plugin, and load its export `./defaults`, only when the `tailwind` option is set, and oxlint loads the plugin from that path.

#### Scenario: A repository that imports the plugin without Tailwind loads nothing extra

- **WHEN** a repository calls `react()` without the `tailwind` option
- **THEN** the configuration names no Tailwind plugin, setting, or rule, and Node loads no `eslint-plugin-better-tailwindcss` module

### Requirement: The Tailwind option configures the plugin

A call to `react({ tailwind: { entryPoint } })` SHALL add the absolute path of `eslint-plugin-better-tailwindcss` to `jsPlugins`, set `settings['better-tailwindcss'].entryPoint` in the root configuration to the given entry point, and turn on `better-tailwindcss/enforce-canonical-classes` and `@inflexa-ai/react/class-constant-name` as errors for TypeScript files. It SHALL set `settings['better-tailwindcss'].selectors` to each selector of `getDefaultSelectors()` of the installed plugin, and after them the variable selector `{ kind: 'variable', name: '^.*_CLASSES$', match: [{ type: 'strings' }, { type: 'objectValues' }] }`.

#### Scenario: The resolved configuration matches the previous shape

- **WHEN** a repository calls `react({ tailwind: { entryPoint: './src/app.css' } })`
- **THEN** `jsPlugins` holds the path of the plugin, `settings` holds that entry point and the selectors, and an override turns on `enforce-canonical-classes` and `class-constant-name` at `error`

#### Scenario: A constant with the suffix gets the Tailwind rules

- **WHEN** the Tailwind rules lint `const RAIL_CLASSES = 'max-w-[40rem]'` or `const LOOKS_CLASSES = { sidebar: { course: 'max-w-[40rem]' } }` with the settings of `react({ tailwind })`
- **THEN** `enforce-canonical-classes` and `no-restricted-classes` report the class, as they report it in `const classes = 'max-w-[40rem]'`

#### Scenario: The rule knows each default callee

- **WHEN** the test suite of the React package compares the callee names of `class-constant-name` with the callee selectors of `getDefaultSelectors()`
- **THEN** each default callee that has a name has the same name in the rule, and the test fails when the plugin adds one
