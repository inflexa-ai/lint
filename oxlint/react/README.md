# @inflexa-ai/oxlint-plugin-react

The oxlint rules and the shared oxlint configuration for React applications, and the typed rules of React for `inflexa-typecheck`. The package includes `@inflexa-ai/oxlint-plugin`, and it installs the plugins of TanStack Query, TanStack Router, Testing Library and Playwright.

## Install

```sh
npm install --save-dev @inflexa-ai/oxlint-plugin-react oxlint oxlint-tsgolint
```

Pin `oxlint` and `oxlint-tsgolint` to exact versions, because JS plugins and type-aware rules are not under semver.

The plugins of React Doctor and Tailwind, `@inflexa-ai/typecheck` and `typescript` are optional peers:

- For the `reactDoctor` option, install `eslint-plugin-react-doctor`.
- For the `tailwind` option, install `eslint-plugin-better-tailwindcss`.
- For the typed rules of the `./typecheck` entry, install `@inflexa-ai/typecheck` and `typescript` 7.0.2.

## Use

Call the factory in `oxlint.config.ts`, and apply the presets to the folders of the repository:

```ts
import { react, tanstack, testingLibrary } from '@inflexa-ai/oxlint-plugin-react'

export default react({
  overrides: [
    { files: ['src/**'], ...tanstack },
    { files: ['**/*.test.tsx'], ...testingLibrary },
  ],
})
```

oxlint gives a JS plugin no type information. Thus the command `inflexa-typecheck` of [`@inflexa-ai/typecheck`](https://github.com/inflexa-ai/lint/tree/main/oxlint/typecheck#readme) runs the rules that read types. The `./typecheck` entry exports the plugin of the typed rules of React, `no-inline-query-key` and `no-void-query-fn`, under the name `@inflexa-ai/react`. Give it to `typecheck()` in `typecheck.config.ts`:

```ts
import { plugin as react } from '@inflexa-ai/oxlint-plugin-react/typecheck'
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  plugins: [react],
  overrides: [{ files: ['src/**'], rules: { '@inflexa-ai/react/no-inline-query-key': 'error', '@inflexa-ai/react/no-void-query-fn': 'error' } }],
})
```

Run the three tools in this sequence:

```sh
oxlint && inflexa-typecheck && directive-guard
```

`directive-guard` comes with `@inflexa-ai/oxlint-plugin`. It reports each disable directive that switches off a rule of `@inflexa-ai/` with no entry in the lint configuration.

## Documentation

- [The factories, the presets and their options](https://github.com/inflexa-ai/lint/tree/main/oxlint#readme)
- [The principle and the options of each rule](https://github.com/inflexa-ai/lint/tree/main/docs/rules)

## License

Apache-2.0. The rule `no-void-query-fn` is a port of a rule of `@tanstack/eslint-plugin-query`, which has the MIT license. Refer to `NOTICE`.