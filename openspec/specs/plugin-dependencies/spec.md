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
