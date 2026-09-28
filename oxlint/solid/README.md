# @inflexa-ai/oxlint-plugin-solid

The oxlint rules and the shared oxlint configuration for SolidJS applications. The package builds on `@inflexa-ai/oxlint-plugin`, and it installs `eslint-plugin-solid`. oxlint runs `eslint-plugin-solid` as a JS plugin.

## Install

```sh
npm install --save-dev @inflexa-ai/oxlint-plugin-solid @inflexa-ai/oxlint-plugin oxlint oxlint-tsgolint
```

Install `@inflexa-ai/oxlint-plugin` beside this package. The repository imports `vitest` from it, and it runs its `directive-guard`.

Pin `oxlint` and `oxlint-tsgolint` to exact versions, because JS plugins and type-aware rules are not under semver.

## Use

Call the factory in `oxlint.config.ts`, and apply the rules of this plugin to the folders of the repository:

```ts
import { vitest } from '@inflexa-ai/oxlint-plugin'
import { solid } from '@inflexa-ai/oxlint-plugin-solid'

export default solid({
  version: 1,
  overrides: [
    {
      files: ['src/**/*.tsx'],
      rules: {
        '@inflexa-ai/solid/no-raw-context': 'error',
        '@inflexa-ai/solid/require-cleanup': 'error',
      },
    },
    { files: ['src/contexts/factory.ts'], rules: { '@inflexa-ai/solid/no-raw-context': 'off' } },
    { files: ['**/*.test.{ts,tsx}'], ...vitest },
  ],
})
```

`solid()` gives the configuration of `typescript()`, the rules of `eslint-plugin-solid/configs/typescript`, and `solid/prefer-show` as an error. It turns on no rule of this plugin. The repository turns them on in its own blocks.

The `version` option writes the major version of Solid to `settings.solid.version`, which `eslint-plugin-solid` reads. The option changes the settings only. With `version: 2`, the rules of `eslint-plugin-solid/configs/v2` stay off, for example `solid/removed-api`. A repository on Solid 2 turns them on in its own blocks.

`typescript()` bans each raw timer, and `solid()` keeps the ban. To let a component use `setInterval` with an `onCleanup`, set `syntax: { timers: false }`. A repository can also turn the ban off in its own blocks.

oxlint gives a JS plugin no type information. Thus `inflexa-typecheck` of `@inflexa-ai/typecheck` runs the rules that read types, together with the type check of `tsc --noEmit`. Install `@inflexa-ai/typecheck` and `typescript` 7.0.2, and write `typecheck.config.ts`:

```ts
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck()
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

Apache-2.0