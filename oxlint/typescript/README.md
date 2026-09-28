# @inflexa-ai/oxlint-plugin

The oxlint rules and the shared oxlint configuration for TypeScript, and the guard of their disable directives.

## Install

```sh
npm install --save-dev @inflexa-ai/oxlint-plugin oxlint oxlint-tsgolint
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

oxlint gives a JS plugin no type information. Thus the command `inflexa-typecheck` of [`@inflexa-ai/typecheck`](https://github.com/inflexa-ai/lint/tree/main/oxlint/typecheck#readme) runs the rules that read types, through `typecheck.config.ts`.

Run the three tools in this sequence:

```sh
oxlint && inflexa-typecheck && directive-guard
```

`directive-guard` reports each disable directive that switches off a rule of this plugin with no entry in the lint configuration.

## Documentation

- [The factories, the presets and their options](https://github.com/inflexa-ai/lint/tree/main/oxlint#readme)
- [The principle and the options of each rule](https://github.com/inflexa-ai/lint/tree/main/docs/rules)

## License

Apache-2.0