# plugin-dependencies Specification

## Purpose

Installing the React plugin brings no Tailwind packages with it, and the Tailwind plugin loads only where a repository asks for Tailwind rules.

## Requirements

### Requirement: Installing the React plugin installs no Tailwind packages

Installing `@inflexa-ai/oxlint-plugin-react` SHALL NOT install `eslint-plugin-better-tailwindcss` or `tailwindcss`. The manifest SHALL name `eslint-plugin-better-tailwindcss` as an optional peer dependency.

#### Scenario: The manifest pulls nothing for Tailwind

- **WHEN** a reader opens the `dependencies` and `peerDependencies` of `oxlint/react/package.json`
- **THEN** `dependencies` does not list `eslint-plugin-better-tailwindcss`, and `peerDependenciesMeta` marks it optional

### Requirement: The Tailwind plugin loads only when a repository asks for Tailwind

No module of the React package SHALL import `eslint-plugin-better-tailwindcss`. `react()` SHALL resolve the path of the plugin only when the `tailwind` option is set, and oxlint loads the plugin from that path.

#### Scenario: A repository that imports the plugin without Tailwind loads nothing extra

- **WHEN** a repository calls `react()` without the `tailwind` option
- **THEN** the configuration names no Tailwind plugin, setting, or rule, and Node loads no `eslint-plugin-better-tailwindcss` module

### Requirement: The Tailwind option configures the plugin

A call to `react({ tailwind: { entryPoint } })` SHALL add the absolute path of `eslint-plugin-better-tailwindcss` to `jsPlugins`, set `settings['better-tailwindcss'].entryPoint` in the root configuration to the given entry point, and turn on `better-tailwindcss/enforce-canonical-classes` as an error for TypeScript files.

#### Scenario: The resolved configuration matches the previous shape

- **WHEN** a repository calls `react({ tailwind: { entryPoint: './src/app.css' } })`
- **THEN** `jsPlugins` holds the path of the plugin, `settings` holds that entry point, and an override turns on `enforce-canonical-classes` at `error`

### Requirement: The READMEs instruct the side-by-side TypeScript install

The README of the React package and the README of the Solid package SHALL instruct in their install instructions the side-by-side install of TypeScript: `@typescript/native` at `npm:typescript@7.0.2` for the compiler and the typed rules, and `typescript` at `npm:@typescript/typescript6@^6.0.2` for the editors. The install instructions SHALL name the package `typescript` no longer as an optional peer of the React package and SHALL hold no instruction that installs `typescript` 7. Each README SHALL give the reason: `@typescript-eslint/utils`, which `@tanstack/eslint-plugin-query` and `eslint-plugin-solid` install, declares the peer range `typescript >=4.8.4 <6.1.0` in release 8.71.0, and typescript-eslint tracks the TypeScript 7 API that lets it widen the range in its issue typescript-eslint/typescript-eslint#10940. Each README SHALL state that the layout makes `npm ls --all` exit 0, that the name `typescript` means TypeScript 6 for the editors and for the plugins, and that `tsc` and `inflexa-typecheck` check with TypeScript 7 through `@typescript/native`.

#### Scenario: A reader of a README finds the layout

- **WHEN** a reader opens the install instructions of `oxlint/react/README.md` or of `oxlint/solid/README.md`
- **THEN** they hold the two `devDependencies` lines with the alias values, name `@typescript-eslint/utils` 8.71.0 and its peer range as the reason, link typescript-eslint/typescript-eslint#10940, state that `npm ls --all` exits 0 and that the editors read `typescript` as TypeScript 6 while `tsc` and `inflexa-typecheck` check with TypeScript 7, and hold no instruction that installs `typescript` 7

#### Scenario: A test pins each note

- **WHEN** the test suite of the React package or of the Solid package runs
- **THEN** a test reads the install instructions of its README and fails when they lose an alias line, the peer range, the release 8.71.0, or the link to issue 10940, or when an instruction installs `typescript` 7 or names it an optional peer of the React package

### Requirement: The TanStack Query plugin stays a bundled dependency

`@inflexa-ai/oxlint-plugin-react` SHALL keep `@tanstack/eslint-plugin-query` in `dependencies`, because the TanStack presets are part of the package.

#### Scenario: The manifest keeps the dependency bundled

- **WHEN** a reader opens `oxlint/react/package.json`
- **THEN** `dependencies` lists `@tanstack/eslint-plugin-query`, and `peerDependencies` does not list it
