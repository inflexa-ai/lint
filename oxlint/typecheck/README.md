# @inflexa-ai/typecheck

The command `inflexa-typecheck`. It does the type check of `tsc --noEmit` on TypeScript 7, and it runs the typed rules of Inflexa on the same program. One run gives the diagnostics of `tsc` and the reports of the rules that read types.

## Install

```sh
npm install --save-dev @inflexa-ai/typecheck
```

Hold the two TypeScript aliases in the `devDependencies` of the repository:

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

The package reads the program through the unstable sync API of TypeScript 7, which is not under semver. Thus it depends on the exact release `npm:typescript@7.0.2` under the alias name `@typescript/native`, and it declares no `typescript` peer. Keep `@typescript/native` in your `devDependencies` at the same exact version, so npm dedupes the two into one TypeScript 7, and raise the two together when a new release comes.

The name `typescript` holds TypeScript 6, which the editor reads. `tsc` and `inflexa-typecheck` check with TypeScript 7 through `@typescript/native`.

## Run

```sh
inflexa-typecheck
inflexa-typecheck -p apps/web -p packages/ui/tsconfig.json
inflexa-typecheck --config lint/typecheck.config.ts
```

- `-p <path>` names a tsconfig, or a folder with a `tsconfig.json`. Give `-p` one time for each project. The command checks the projects in the sequence of the flags, in one TypeScript process. Without `-p`, the command checks `tsconfig.json` of the working folder.
- `--config <path>` names the configuration file, relative to the working folder. Without `--config`, the command reads `typecheck.config.ts` of the working folder. Without that file, it uses `typecheck()`.

The command replaces `tsc --noEmit` and the ESLint run of the typed rules. It does not emit, and it has no `--build`, `--watch` or `--pretty`.

## Output

For each project, the command prints the lines that `tsc --noEmit --pretty false -p <project>` prints, in the same sequence. The paths are relative to the working folder. The command checks each project with the options of `tsc --noEmit`, also when its tsconfig does not set `noEmit`.

Then the command prints the reports of the rules and the problems of the directives of all projects, sorted by path, line and column:

```text
src/run.ts(4,3): error must-use-result: Result must be handled with either of match, unwrapOr, _unsafeUnwrap or _unsafeUnwrapErr.
src/run.ts(9,1): error typecheck-disable: The directive gives no reason. Write the reason after ` -- `.
```

A report has the id of the rule in the place of `TS<code>`. A problem matcher that expects `error TS<digits>:` reads the diagnostics of `tsc`, but it does not read the reports of the rules. To read both, match `error <id>:`, where the id is `TS<digits>`, a rule id, or `typecheck-disable`.

One difference from `tsc` exists. For a project with `references`, the command reads the source files of each referenced project, as the project service of an editor does. It does not read their built declarations. Thus it prints no TS6305 for a referenced project that is not built, and it checks each import against the source.

The command exits with 1 when it prints a line. It also exits with 1 when it cannot load a project, the configuration, a plugin or the options of a rule. Otherwise it exits with 0.

A rule runs on each file of a project that is not a declaration file, not under `node_modules`, and under the working folder. A file in more than one project gets the rule of the first project of the `-p` sequence that holds it. Thus the sequence of the flags selects the options of the program for a shared file.

## Configuration

`typecheck.config.ts` default-exports the value of `typecheck()`:

```ts
import { plugin as react } from '@inflexa-ai/oxlint-plugin-react/typecheck'
import { typecheck } from '@inflexa-ai/typecheck'

export default typecheck({
  plugins: [react],
  overrides: [
    { files: ['src/**'], rules: { 'must-use-result': ['error', { consumers: ['unwrapOrThrow'] }] } },
    { files: ['src/legacy/**'], rules: { 'must-use-result': 'off' } },
    { files: ['src/**/*.tsx'], rules: { '@inflexa-ai/react/no-void-query-fn': 'error' } },
  ],
})
```

- `files` holds globs, relative to the working folder.
- `rules` maps a rule id to `'error'`, `'off'`, or `['error', options]`.
- For a file and a rule, the last override that matches the file and names the rule sets the severity.
- `['error', options]` sets the options. `'error'` alone keeps the options of an earlier override that matches the file.
- `typecheck()` puts its own block first. That block turns on `no-generated-empty-object-type` for `**/*.{ts,tsx}`.

Each of these problems stops the run with a message: an unknown rule id, a plugin that loads two times under one name, and options that the rule refuses.

Node.js removes the types of the file when it loads it. Thus the file uses only the syntax that Node.js can remove, as the other TypeScript configuration files do.

## Rules

| Rule                             | Document                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `must-use-result`                | [must-use-result](https://github.com/inflexa-ai/lint/blob/main/docs/rules/must-use-result.md)                               |
| `require-abort-signal`           | [require-abort-signal](https://github.com/inflexa-ai/lint/blob/main/docs/rules/require-abort-signal.md)                     |
| `no-generated-empty-object-type` | [no-generated-empty-object-type](https://github.com/inflexa-ai/lint/blob/main/docs/rules/no-generated-empty-object-type.md) |

The rules of this package have no prefix. The rules of a plugin have the id `<plugin name>/<rule name>`, where the plugin name is the `name` of the plugin object. The `./typecheck` entry of `@inflexa-ai/oxlint-plugin-react` gives the plugin `@inflexa-ai/react`.

## Directive

To disable a rule on the next line, write a comment with the directive, the ids of the rules, and the reason after `--`:

```ts
// typecheck-disable-next-line must-use-result -- the caller logs the error
getResult()
```

- The directive suppresses the reports of the named rules on the line after the last line of the comment. A block comment can hold the directive too.
- A directive with no reason is a problem. It still suppresses the reports, thus one mistake gives one line.
- A directive that names no rule is a problem.
- A named rule that suppresses nothing is a problem, also when the id is unknown or the rule is off for the file.
- A directive does not suppress a diagnostic of `tsc`.
- The command reads directives in comments only, not in a string or a template.

## Write a rule

A repository gives its own rules as a plugin:

```ts
import { isCallExpression, SyntaxKind } from '@inflexa-ai/typecheck/unstable/ast'
import type { Plugin, RuleModule } from '@inflexa-ai/typecheck'

const noRawDate: RuleModule<{ allowIn: string[] }> = {
  meta: {
    docs: { description: 'Use the clock of the app', url: 'https://example.com/no-raw-date' },
    messages: { rawDate: 'Read the time from the clock of the app, not from `{{call}}`.' },
    defaultOptions: { allowIn: [] },
  },
  create(context) {
    return {
      [SyntaxKind.CallExpression]: (node) => {
        if (isCallExpression(node) && node.expression.getText(context.sourceFile) === 'Date.now') {
          context.report({ node, messageId: 'rawDate', data: { call: 'Date.now' } })
        }
      },
    }
  },
}

export const himmel: Plugin = { name: 'himmel', rules: { 'no-raw-date': noRawDate } }
```

- `create` receives a context with `id`, `options`, `sourceFile`, `program`, `checker` and `report`. It returns the functions that the command calls for the nodes of each syntax kind. The command walks each file one time for all rules.
- A report starts at the start of its node, without the leading trivia. The data fills the `{{name}}` placeholders of the message.
- The command merges the configured options over `defaultOptions`. It refuses a key that the defaults do not have, and a value of another JSON kind. An optional `checkOptions` returns a problem with the merged options. `stringArraysOnly` refuses an array option with an element that is not a string.

## Rule tester

`@inflexa-ai/typecheck/rule-tester` runs the cases of a rule in a test framework:

```ts
import { createRuleTester, RuleTester } from '@inflexa-ai/typecheck/rule-tester'
import { afterAll, describe, it } from 'vitest'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.afterAll = afterAll

createRuleTester({ fixtures: new URL('./fixtures/', import.meta.url).pathname }).run('himmel/no-raw-date', noRawDate, {
  valid: ['export const now = clock.now()'],
  invalid: [{ code: 'export const now = Date.now()', errors: [{ messageId: 'rawDate', data: { call: 'Date.now' }, line: 1, column: 20 }] }],
})
```

- The fixture folder holds a `tsconfig.json` that includes the file names of the cases, `case.ts` by default. A case can give another `filename`, and `options`.
- The tester fails a valid case that reports anything. It fails an invalid case whose reports differ in number, in sequence, in message id, or in a given data, line or column.
- Each case is a file of the fixture folder that the tester gives to TypeScript. One TypeScript process serves each `run`.

## License

Apache-2.0. The rules `must-use-result` and `no-generated-empty-object-type` are ports of rules of `@ninoseki/eslint-plugin-neverthrow` and of typescript-eslint, which have the MIT license. Refer to `NOTICE`.