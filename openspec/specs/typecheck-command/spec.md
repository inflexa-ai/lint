# typecheck-command Specification

## Purpose

The command `inflexa-typecheck` of `@inflexa-ai/typecheck` type-checks the projects of a repository on TypeScript 7, and runs the typed rules on the same program, so one run gives the diagnostics of `tsc --noEmit` and the reports of the rules that read types.

## Requirements

### Requirement: The command checks each project of -p

`inflexa-typecheck` SHALL check each tsconfig that a `-p` flag names, in the order of the flags. A `-p` value SHALL name a tsconfig file, or a folder whose `tsconfig.json` it checks. Without a `-p` flag, the command SHALL check `tsconfig.json` of the working directory. When the named file, or the `tsconfig.json` of the named folder, does not exist, the command SHALL print a message that names the path and exit with status 1. The command SHALL check the projects in one TypeScript process.

#### Scenario: Two projects

- **WHEN** a person runs `inflexa-typecheck -p apps/lumen -p packages/ui/tsconfig.json`
- **THEN** the command checks `apps/lumen/tsconfig.json` and then `packages/ui/tsconfig.json`

#### Scenario: No -p flag

- **WHEN** a person runs `inflexa-typecheck` in a folder that holds `tsconfig.json`
- **THEN** the command checks that tsconfig

#### Scenario: A missing project

- **WHEN** a person runs `inflexa-typecheck -p missing/tsconfig.json`
- **THEN** the command prints a message that names `missing/tsconfig.json`, and exits with status 1

### Requirement: The command prints the diagnostics of tsc --noEmit

For each project, the command SHALL print the same lines, in the same order, as `tsc --noEmit --pretty false -p <project>` of the installed TypeScript prints, from the same working directory. The lines of a project SHALL come after the lines of the project before it. Two exceptions hold. For a project with `references`, the command SHALL read the sources of the referenced projects, as the project service of an editor does, and not their built declarations, thus it prints no error for a referenced project that is not built. For a tsconfig that does not parse, an option that it inherits through `extends` and that depends on emit can add a line that `tsc --noEmit` does not print, and the command still exits with status 1.

#### Scenario: A type error

- **WHEN** a project holds `const n: number = 's'`
- **THEN** the command prints the line that `tsc --noEmit --pretty false` prints for it, for example `src/a.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.`

#### Scenario: A tsconfig without noEmit

- **WHEN** a tsconfig sets `allowImportingTsExtensions: true` and does not set `noEmit`
- **THEN** the command prints no error for the option, as `tsc --noEmit` prints none

#### Scenario: A project with a syntax error, a declaration error and an option error

- **WHEN** the command checks a fixture project that `tsc --noEmit --pretty false` also checks
- **THEN** the output of the command and the output of `tsc` are the same text

#### Scenario: A project reference that is not built

- **WHEN** a project names a referenced project in `references`, the referenced project is not built, and a file imports it
- **THEN** the command checks the import against the source of the referenced project, and prints no TS6305

#### Scenario: A tsconfig that does not parse, or that conflicts with noEmit

- **WHEN** a tsconfig holds invalid JSON, or sets `emitDeclarationOnly: true`
- **THEN** the command prints the same text as `tsc --noEmit --pretty false`, with the path of the real tsconfig and never the path of a file that the command makes, and exits with status 1

### Requirement: The command prints each rule report in the format of tsc

The command SHALL print each report of a rule as `<path>(<line>,<column>): error <rule id>: <message>`. The path SHALL be relative to the working directory, and the line and the column SHALL start at 1 and give the start of the reported node, without its leading trivia. The rule reports and the directive problems SHALL come after the diagnostics of all projects, sorted by path, line and column. A rule SHALL run on each file of a project that is not a declaration file, is not under a `node_modules` folder, and is under the working directory. It SHALL run once on each file, in the first project of the `-p` order that holds the file. The command SHALL print and sort by the file name that the program gives, and not by a canonical form of the path.

#### Scenario: A report of must-use-result

- **WHEN** `src/run.ts` holds `getResult()` as a statement on line 4, column 3, and `must-use-result` is on for `src/**`
- **THEN** the command prints `src/run.ts(4,3): error must-use-result: ` and the message of the rule

#### Scenario: A file in two projects

- **WHEN** the file `vite.config.ts` belongs to both projects of the run, and a rule reports it
- **THEN** the command prints the report once

### Requirement: The command exits with 1 on a problem

The command SHALL exit with status 1 when it prints a diagnostic, a rule report, or a directive problem, or when the configuration, a plugin, a rule option or a project cannot load. Otherwise it SHALL exit with status 0.

#### Scenario: A clean run

- **WHEN** no project has a diagnostic and no rule reports anything
- **THEN** the command prints nothing and exits with status 0

#### Scenario: A rule report only

- **WHEN** the diagnostics are clean and one rule reports one node
- **THEN** the command exits with status 1

### Requirement: A configuration file turns on the rules for globs

The command SHALL load `typecheck.config.ts` of the working directory, or the file that `--config <path>` names. The default export SHALL be the value of `typecheck({ plugins, overrides })` of `@inflexa-ai/typecheck`. Without a configuration file, the command SHALL use `typecheck()`. An override SHALL hold `files`, globs relative to the working directory, and `rules`, a map from a rule id to `'error'`, `'off'`, or `['error', options]`. For a file and a rule, the last override that matches the file and names the rule SHALL decide the severity. `['error', options]` SHALL set the options of the rule, and `'error'` without options SHALL keep the options of the last earlier override that matched the file and gave options, or the default options. `typecheck()` SHALL put its own block before the overrides of the repository, and that block SHALL turn on `no-generated-empty-object-type` for `**/*.{ts,tsx}`. A rule id that no rule has, a setting other than `'error'`, `'off'` or `['error', options]` with an object as options, a plugin that loads twice under one name, and options that the rule rejects SHALL each stop the run with a message that names the rule or the plugin. When `--config` names a file that does not exist, the command SHALL print a message that names the path and exit with status 1.

#### Scenario: A rule for the source of a repository

- **WHEN** `typecheck.config.ts` default-exports `typecheck({ overrides: [{ files: ['src/**'], rules: { 'must-use-result': ['error', { consumers: ['unwrapOrThrow'] }] } }] })`
- **THEN** the command runs `must-use-result` with the option `consumers` on each file under `src/`, and on no other file

#### Scenario: A later override turns a rule off

- **WHEN** an override turns on `must-use-result` for `src/**`, and a later override sets it to `'off'` for `src/legacy/**`
- **THEN** the command does not run `must-use-result` on a file under `src/legacy/`

#### Scenario: A later severity without options

- **WHEN** an override gives `must-use-result` `['error', { consumers: ['unwrapOrThrow'] }]` for `src/**`, and a later override gives it `'error'` for `src/loop/**`
- **THEN** the command runs `must-use-result` with the option `consumers` on a file under `src/loop/`

#### Scenario: The default rule

- **WHEN** a repository has no configuration file, and a type reference resolves to `{}`
- **THEN** the command reports it with `no-generated-empty-object-type`

#### Scenario: An unknown rule id

- **WHEN** an override names `must-use-results`
- **THEN** the command prints a message that names `must-use-results`, and exits with status 1

#### Scenario: A severity that the command does not have

- **WHEN** an override sets `must-use-result` to `'warn'`
- **THEN** the command prints a message that names `must-use-result` and the permitted settings, and exits with status 1

#### Scenario: An unknown option

- **WHEN** an override gives `require-abort-signal` the options `{ declared: [] }`
- **THEN** the command prints a message that names `require-abort-signal` and `declared`, and exits with status 1

### Requirement: A plugin adds rule modules under its name

`typecheck({ plugins })` SHALL accept plugins, each with a name and a map of rule modules. The id of a rule of a plugin SHALL be `<plugin name>/<rule name>`, where the plugin name is the name that the plugin object gives itself. The rules of `@inflexa-ai/typecheck` SHALL have ids with no prefix. A repository SHALL be able to give its own rule modules as a plugin.

#### Scenario: The React plugin

- **WHEN** a configuration holds `import { plugin as react } from '@inflexa-ai/oxlint-plugin-react/typecheck'` and `typecheck({ plugins: [react], overrides: [{ files: ['src/**'], rules: { '@inflexa-ai/react/no-void-query-fn': 'error' } }] })`, and the plugin object names itself `@inflexa-ai/react`
- **THEN** the command runs `no-void-query-fn` of the React package on the files under `src/`

#### Scenario: A rule of the repository

- **WHEN** a configuration gives a plugin named `himmel` with the rule module `no-raw-date`, and an override turns on `himmel/no-raw-date`
- **THEN** the command runs that module and prints its reports as `error himmel/no-raw-date:`

### Requirement: A rule module reads the program of its project

A rule module SHALL declare its messages, the URL of its document, and its default options as one object, and SHALL give a function that receives a context and returns the syntax kinds that it visits. The context SHALL give the options of the file, the source file, the program and the checker of the project, and a function that reports a node with a message id and data for the message. The command SHALL merge the options of the configuration over the default options, and SHALL reject a key that the default options do not have and a value whose JSON kind (array, string, number, boolean, object) differs from the default value. A rule module can also give a function that checks its merged options, and the command SHALL report the error of that function with the id of the rule. The typed rules of this repository SHALL reject an array option with an element that is not a string. The command SHALL visit each file once for all the rules that are on for it.

#### Scenario: A report with data

- **WHEN** a rule reports a node with the message id `indirectCall` and the data `{ through: 'Reflect.apply' }`, and its message is ``This call goes through `{{through}}`.``
- **THEN** the command prints ``This call goes through `Reflect.apply`.`` as the message of the report

### Requirement: A directive disables a rule on the next line with a reason

The command SHALL read `typecheck-disable-next-line <rule id>[, <rule id>] -- <reason>` from a line comment or a block comment, and SHALL not read directive text in a string or a template. The command SHALL read the directives of each file that the rules visit, also when no rule is on for the file. The directive SHALL suppress each report of a named rule whose node starts on the line after the last line of the comment. A directive with no reason after ` -- ` SHALL be a problem. A named rule that the directive suppresses nothing for SHALL be a problem, also when the id is unknown or the rule is off for the file, and so SHALL a directive that names no rule. The command SHALL print a directive problem as `<path>(<line>,<column>): error typecheck-disable: <message>`, at the start of the comment. A directive SHALL not suppress a diagnostic of `tsc`.

#### Scenario: A directive with a reason

- **WHEN** a line carries `// typecheck-disable-next-line must-use-result -- the caller logs the error`, and the next line holds a statement that drops a `Result`
- **THEN** the command prints no report for that statement and no directive problem

#### Scenario: A directive without a reason

- **WHEN** a line carries `// typecheck-disable-next-line must-use-result`, and the next line drops a `Result`
- **THEN** the command prints a `typecheck-disable` problem at the directive, and prints no report of `must-use-result` for that line

#### Scenario: A block comment on more than one line

- **WHEN** a block comment starts on line 3 and ends on line 5 with `typecheck-disable-next-line must-use-result -- the caller logs the error`, and line 6 drops a `Result`
- **THEN** the command prints no report for line 6 and no directive problem

#### Scenario: A directive that suppresses nothing

- **WHEN** a line carries `// typecheck-disable-next-line must-use-result -- old`, and the rule reports nothing on the next line
- **THEN** the command prints a `typecheck-disable` problem that names `must-use-result`, and exits with status 1

### Requirement: A rule tester runs the cases of a typed rule

`@inflexa-ai/typecheck/rule-tester` SHALL run the valid and the invalid cases of a rule module against a fixture folder whose tsconfig holds the file of the case. A case SHALL give the code, and can give a file name and options. An invalid case SHALL list the expected reports by message id, and can give the data, the line and the column of each. The tester SHALL fail a valid case that reports anything, and an invalid case whose reports differ from the list in number, order, message id, or a given data, line or column. The tester SHALL take the functions `describe` and `it` of the test framework.

#### Scenario: A case that reports too much

- **WHEN** a valid case of `must-use-result` holds `getResult()` as a statement
- **THEN** the tester fails that case and shows the report

#### Scenario: A repository tests its own rule

- **WHEN** a repository runs the tester of the package with its own rule module and fixture folder in vitest
- **THEN** each case runs as a vitest test

### Requirement: The package takes TypeScript 7 as the exact alias dependency

`@inflexa-ai/typecheck` SHALL take the exact TypeScript 7 release that the CI of this repository uses as its dependency under the alias name `@typescript/native` (`npm:typescript@7.0.2`), because `typescript/unstable/sync` is not under semver. The package SHALL declare no `typescript` peer. The workspace SHALL install TypeScript 7 as `@typescript/native` at `npm:typescript@7.0.2` and TypeScript 6 as `typescript` at `npm:@typescript/typescript6@^6.0.2`, so the peer of `@typescript-eslint/utils` resolves to TypeScript 6 and `npm ls --all` exits 0.

#### Scenario: The dependency pins the version

- **WHEN** a reader opens `oxlint/typecheck/package.json`
- **THEN** `dependencies` holds `@typescript/native` at `npm:typescript@7.0.2`, and `peerDependencies` names no `typescript` entry

#### Scenario: The workspace installs the layout

- **WHEN** a reader opens `oxlint/package.json` and runs `npm ls --all` at `oxlint/`
- **THEN** `devDependencies` holds `@typescript/native` at `npm:typescript@7.0.2` and `typescript` at `npm:@typescript/typescript6@^6.0.2`, and the command exits 0

### Requirement: The package re-exports the TypeScript 7 modules that a rule needs

`@inflexa-ai/typecheck` SHALL export the AST module of its TypeScript 7 dependency as `./unstable/ast` and the sync API module as `./unstable/sync`, so a typed rule imports the helpers and the types of TypeScript 7 through `@inflexa-ai/typecheck` and names no TypeScript 7 package. No module of the packages of this workspace SHALL import `typescript/unstable/*`. No manifest of the workspace SHALL declare the package `typescript` at 7 as a dependency or a peer; TypeScript 7 is declared only under the alias name `@typescript/native`.

#### Scenario: A rule imports through the package

- **WHEN** the typed rules of the React package read syntax helpers, types and checker types
- **THEN** they import them from `@inflexa-ai/typecheck/unstable/ast` and `@inflexa-ai/typecheck/unstable/sync`

#### Scenario: No workspace module names TypeScript 7

- **WHEN** a reader searches the sources and the manifests of the packages under `oxlint/`
- **THEN** no import resolves `typescript/unstable/*`, and no manifest holds a `typescript` dependency or peer at 7
