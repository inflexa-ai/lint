# @inflexa-ai/oxlint-plugin-react

The oxlint rules and the shared oxlint configuration for React applications. The package includes `@inflexa-ai/oxlint-plugin`, and it installs the plugins of TanStack Query, TanStack Router, Testing Library and Playwright.

## Install

```sh
npm install --save-dev @inflexa-ai/oxlint-plugin-react oxlint oxlint-tsgolint eslint typescript
```

Pin `oxlint` and `oxlint-tsgolint` to exact versions, because JS plugins and type-aware rules are not under semver.

The plugins of React Doctor and Tailwind are optional peers:

- For the `reactDoctor` option, install `eslint-plugin-react-doctor`.
- For the `tailwind` option, install `eslint-plugin-better-tailwindcss`.

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

oxlint gives a JS plugin no type information. Thus ESLint runs the rules that read types, through `eslint.config.js`:

```js
import { react } from '@inflexa-ai/oxlint-plugin-react/eslint'

export default [...react({ tsconfigRootDir: import.meta.dirname })]
```

Run the three tools in this sequence:

```sh
oxlint && eslint . && directive-guard
```

`directive-guard` comes with `@inflexa-ai/oxlint-plugin`. It reports each disable directive that switches off a rule of `@inflexa-ai/` with no entry in the lint configuration.

## Documentation

- [The factories, the presets and their options](https://github.com/inflexa-ai/lint/tree/main/oxlint#readme)
- [The principle and the options of each rule](https://github.com/inflexa-ai/lint/tree/main/docs/rules)

## License

Apache-2.0