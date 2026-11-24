# Proposal

## Why

The Tailwind rules of `react()` do not see the classes in a module constant. `react()` sets only `entryPoint` in `settings['better-tailwindcss']` (`oxlint/react/src/index.ts:199`). Thus the plugin uses its default variable selectors, which match only a string value of `className`, `classNames`, `classes`, `style` and `styles`. In ubb-tutor_client, `const RAIL_BUTTON = 'flex w-[13px] -mt-2'` gets no error, and `const classes = 'flex w-[13px] -mt-2'` gets the errors of `no-restricted-classes`. The constants of that repository go into `className`, into `cn()`, and into object maps such as `LOOKS[look].course`.

## What Changes

- `react({ tailwind })` sets `selectors` in `settings['better-tailwindcss']`: each default selector of the plugin, and a variable selector for each name that ends in `_CLASSES`. The new selector matches a string value and each string in an object value, at each depth. A `selectors` setting replaces the defaults of the plugin, thus `react()` gets them from `getDefaultSelectors()` of `eslint-plugin-better-tailwindcss/defaults`.
- A new rule `@inflexa-ai/react/class-constant-name`: a module `const` with a string, template or object value that goes into a class attribute or into an argument of a class function, such as `cn` or `cva`, must have a name that ends in `_CLASSES`. The message gives the new name. The suffix is fixed, with no option.
- `react({ tailwind })` turns on `class-constant-name` at `error` in its Tailwind block, because the selectors and the rule are one convention.
- The `unwrap` function of `no-conditional-spread` and of `no-unbounded-promise-all` moves to a shared helper, because the new rule uses it too, and `CONTRIBUTING.md` asks for one copy of each operation.
- The shared packages go to 0.10.0.

## Capabilities

### New Capabilities

- `class-constant-name`: the name of a module constant that holds Tailwind classes.

### Modified Capabilities

- `plugin-dependencies`: the Tailwind option sets the selectors of the plugin and turns on `class-constant-name`, and `react()` loads the defaults entry of the plugin only when the option is set.

## Impact

- Code: `oxlint/react/src/index.ts`, `oxlint/react/src/plugin.ts`, the new `oxlint/react/src/rules/class-constant-name.ts`, and the new helper in `oxlint/typescript/src/helpers/`.
- Tests: `oxlint/react/src/test/tailwind.test.ts` and the new `oxlint/react/src/rules/test/class-constant-name.test.ts`.
- Documents: the new `docs/rules/class-constant-name.md`, and the Tailwind paragraph of `oxlint/README.md`.
- Consumers: a repository with the `tailwind` option gets new reports of `class-constant-name`, and new Tailwind reports in each constant that it renames.
