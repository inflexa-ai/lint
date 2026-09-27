# @inflexa-ai/oxlint-plugin

The oxlint rules and the shared oxlint configuration for TypeScript, and the ESLint configuration of the rules that read types.

## Install

```sh
npm install --save-dev @inflexa-ai/oxlint-plugin oxlint oxlint-tsgolint eslint typescript
```

Pin `oxlint` and `oxlint-tsgolint` to exact versions, because JS plugins and type-aware rules are not under semver.

## Use

Call the factory in `oxlint.config.ts`:

```ts
import { typescript, vitest } from '@inflexa-ai/oxlint-plugin'

export default typescript({
  overrides: [{ files: ['**/*.test.ts'], ...vitest }],
})
```

oxlint gives a JS plugin no type information. Thus ESLint runs the rules that read types, through `eslint.config.js`:

```js
import { typescript } from '@inflexa-ai/oxlint-plugin/eslint'

export default [...typescript({ tsconfigRootDir: import.meta.dirname })]
```

Run the three tools in this sequence:

```sh
oxlint && eslint . && directive-guard
```

`directive-guard` reports each disable directive that switches off a rule of this plugin with no entry in the lint configuration.

## Documentation

- [The factories, the presets and their options](https://github.com/inflexa-ai/lint/tree/main/oxlint#readme)
- [The principle and the options of each rule](https://github.com/inflexa-ai/lint/tree/main/docs/rules)

## License

Apache-2.0