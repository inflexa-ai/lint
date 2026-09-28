# Design

## Context

See proposal.md for the motivation. The workspace `oxlint/` holds `@inflexa-ai/oxlint-plugin` (`typescript/`) and `@inflexa-ai/oxlint-plugin-react` (`react/`). Today the typed rules `require-abort-signal` and `no-inline-query-key` are ESLint rules on the TypeScript 6 API, reached through the `./eslint` entries, and the helpers `helpers/type-information.ts` and `helpers/reflective-calls.ts` serve them. The syntax rules import `AST_NODE_TYPES`, `TSESTree` and `TSESLint` from `@typescript-eslint/utils`, and two SAFETY casts in `plugin.ts` and `rules/test/rule-tester.ts` bridge the rule types of typescript-eslint to those of ESLint and oxlint.

A throwaway probe of `typescript/unstable/sync` 7.0.2 (`tmp/claude/ts7-run/probe/`) settled the main risk of the issue:

- `new API({ cwd })` spawns the native `tsc` binary of the package, and each call is a synchronous round trip over a pipe. `updateSnapshot({ openProjects: [tsconfig] })` opens a project in 0.03 s to 0.3 s.
- On harness (2285 program files, 465 own files), the program diagnostics took 0.7 s, and formatted as `tsc --pretty false` prints them, they were the same bytes as the log of `tsc --noEmit` 7.0.2.
- The AST of the own files of harness (347601 nodes) came over and was walked in 0.1 s. One `getTypeAtLocation` or `getResolvedSignature` call costs 25 µs to 80 µs on a warm project, and up to 360 µs while the checker is cold. The array overload of `getTypeAtLocation` costs 24 µs a node.
- `Checker` has `getResolvedSignature`, `getTypeAtLocation`, `getSymbolAtLocation`, `getReferencesToSymbolInFile`, `getPropertyOfType`, `getApparentType`, `getNonNullableType`, `getTypeOfSymbolAtLocation`, `getSignaturesOfType`, `getReturnTypeOfSignature`, `getParameterType`, `getIndexInfosOfType`, `isTypeAssignableTo`, `getNumberType`, `getStringType` and `typeToString`. It has no `getAwaitedType`. A signature gives its declaration as a `NodeHandle` with a `path`, and `resolve()` fetches the AST of that file.
- A project whose tsconfig has no `noEmit` gets option diagnostics that `tsc --noEmit` does not print (TS5096 for `allowImportingTsExtensions`). A virtual tsconfig that extends the real one and sets `noEmit: true`, served through the `readFile` callback of the API, gives the diagnostics of `tsc --noEmit`, at no measurable cost on harness.
- `tsc` 7 with `declaration: true` and `--noEmit` prints the declaration diagnostics together with the semantic ones, sorted by position. The order of `tsc` 6 does not hold.
- A case file that the `readFile`, `fileExists` and `getAccessibleEntries` callbacks serve, with a new snapshot for each case, checks 50 cases in 50 ms in one process. The client keeps the old AST of a changed file unless `clearSourceFileCache()` runs before the next snapshot.

oxlint 1.85 and 1.86 give a JS plugin no type information, and `@oxlint/plugins` publishes the rule types of oxlint (`Rule`, `Context`, `Plugin`, and `ESTree` nodes whose `type` is a string literal). `npm ci` of PR #5 fails only because the root and the workspaces depend directly on `@typescript-eslint/rule-tester`, `@typescript-eslint/utils` and `typescript-eslint`, which peer on `typescript <6.1.0`. The third-party JS plugins of the React package get a nested TypeScript 6 of their own in the lock file of that PR.

## Goals / Non-Goals

**Goals:**

- One command gives the diagnostics of `tsc --noEmit` and the typed rules on one program per project.
- The rule interface, the configuration and the directive stay small enough for a repository to write its own typed rule.

**Non-Goals:**

- Emit, `--build`, `--watch`, `--pretty`, the severity `warn`, fixes and suggestions.
- Typed rules in oxlint, and a port of each typed rule of typescript-eslint.
- The follow-up work in the consumer repositories (the "After the release" list of the issue).

## Decisions

### A new workspace holds the command and the typed rules of TypeScript

`oxlint/typecheck/` is the package `@inflexa-ai/typecheck`, with the bin `inflexa-typecheck` (`dist/cli.js`). Its entries: `.` (the factory `typecheck()`, the rule and plugin types), `./rule-tester`, and `./helpers/*` (the typed helpers, first `reflective-calls`, which moves here from `@inflexa-ai/oxlint-plugin`). Its rules: `must-use-result`, `require-abort-signal`, `no-generated-empty-object-type`. The React package adds the entry `./typecheck`, whose named export `plugin` is named `@inflexa-ai/react` and holds `no-inline-query-key` and `no-void-query-fn`. The React package names `@inflexa-ai/typecheck` (the shared version) and `typescript` (7.0.2) as optional peers in `peerDependenciesMeta`, as it does for the Tailwind and React Doctor plugins: only the `./typecheck` entry loads them, and a repository that runs only oxlint does not have to move to TypeScript 7. `@inflexa-ai/oxlint-plugin` holds oxlint rules only and drops its `typescript` and `eslint` peers.

Alternative: keep `require-abort-signal` in `@inflexa-ai/oxlint-plugin` under a `./typecheck` entry. Rejected: the issue writes the directive with the bare id `must-use-result`, which fits rules that the command owns, and the oxlint package then needs no TypeScript peer.

### Rule ids follow the oxlint form

The rules of `@inflexa-ai/typecheck` have bare ids. A plugin is `{ name, rules }`, and its rules have the ids `<name>/<rule>`, as the JS plugins of oxlint do. The React plugin keeps the id `@inflexa-ai/react/no-inline-query-key` of today. `require-abort-signal` loses the prefix `@inflexa-ai/`: a repository rewrites the id in the same migration that replaces `eslint.config.js` with `typecheck.config.ts`, and a bare id keeps the directive short, as the issue writes it.

### One process for all projects, and a virtual tsconfig for --noEmit

The command opens every project of the run in one snapshot of one `API`. For each `-p`, it serves a virtual tsconfig, `.inflexa-typecheck.<real name>` in the folder of the real one, through the `readFile` callback. Its text is the text of the real file with `"noEmit": true` added as the last member of the root `compilerOptions`, or with a `compilerOptions` member added before the closing brace of the root object. A scan that skips strings and comments finds the place. Each offset before the insertion is the offset of the real file, and each offset after it moves back by the length of the insertion, thus a diagnostic that the program locates in the virtual file prints at the line and the column of the real file, with the real path. A diagnostic located on the inserted text prints with no location, as a diagnostic of an option of the command line of `tsc` has none. `extends`, `include`, `files`, `exclude` and `references` resolve from the same folder, thus the program holds the files of the real project with the options of `tsc --noEmit`. A text in which the scan finds no root object, or a `compilerOptions` key with no value, is served as it is, because the program then reports the parse errors of the real file. One gap stays for such a text: an option from `extends` that depends on emit (for example `allowImportingTsExtensions`) can add a line that `tsc --noEmit` does not print. Both runs exit with 1, and no insertion removes that line without a new diagnostic of its own. A first version extended the real file from a small wrapper, and the option diagnostics of the real file (TS5102 for `baseUrl`, for example) then lost their location.

The API serves a referenced project from its sources, as the project service of an editor does, thus the command does not print TS6305 for a reference that is not built. The spec states this exception, and the README says it. No consumer of today uses `references`.

The command mirrors the diagnostic collection and the sort of `tsc` 7 (the `EmitFilesAndReportErrors` path of typescript-go at the tag of 7.0.2, read through `gh api`), formats a diagnostic as `tsc --pretty false` does (the location, `error TS<code>: `, the text, and each chained message two spaces deeper), and prints the paths relative to the working directory. A test runs the `tsc` binary of the installed package and the command on the same fixture projects and compares the text: a type error, a syntax error, a declaration error with `declaration: true`, an option that needs `noEmit`, a chained message, a related location, and a diagnostic with no file.

Alternative: filter the option codes that depend on `noEmit`. Rejected: the list lives in typescript-go and changes without notice.

### The output and the exit status

Rule reports and directive problems come after the diagnostics of all projects, sorted by path, line and column, as `path(line,col): error <id>: <message>`. A problem matcher that expects `TS<digits>` reads the diagnostics and not the rule reports; the README says so. A rule runs once on each file, in the first project of the `-p` order that holds it, so a file in two tsconfigs gets one report. The project service of ESLint also gives each file one project, and the order of the flags lets a repository pick the project whose options it wants for a shared file, for example `vite.config.ts` in the root tsconfig and in the tsconfig of an app. The paths come from `SourceFile.fileName`, because `Path` and `NodeHandle.path` are canonical, and in lower case on a file system that ignores case. The exit status is 1 when the command prints anything or cannot load its input, and 0 otherwise.

### The configuration mirrors the oxlint factory

`typecheck.config.ts` in the working directory, or `--config <path>`, default-exports `typecheck({ plugins, overrides })`. The command loads it with `import()`, thus Node strips the types, and the file keeps to erasable syntax, as the source of the workspace already does. `typecheck()` returns a plain object: its own block `{ files: ['**/*.{ts,tsx}'], rules: { 'no-generated-empty-object-type': 'error' } }` first, then the overrides of the repository, as `typescript()` of the oxlint package puts its blocks before the repository's. The rule is on by default because the `./eslint` factory turned it on for each TypeScript file. For a file and a rule, the last block that matches and names the rule decides. The globs match the path relative to the working directory with `path.matchesGlob`, as `directive-guard` does. A severity is `'error'` or `'off'`. The tsc format has `warning`, but the exit status of the command does not depend on a severity, and no consumer sets a typed rule to `warn` (the ESLint configurations of himmel, harness, cli, prov-kernel, cortex and bench use `error` only). `['error', options]` sets the options, and a later `'error'` keeps the options of the earlier block, as a flat configuration of ESLint does.

A rule declares `defaultOptions` as one object. The command merges the configured object over it, and rejects a key that the defaults do not have or a value of another JSON kind (array, string, number, boolean, object). A rule module can also give a function that checks its merged options, and each typed rule of this repository uses it to reject an array element that is not a string. The workspace has no JSON schema validator, and the typed rules take flat objects of arrays of strings.

### The rule interface walks the TypeScript 7 AST once per file

A rule module is `{ meta: { docs: { description, url }, messages, defaultOptions }, create(context) }`. `create` returns a visitor keyed by `SyntaxKind`. The context gives `id`, `options`, `sourceFile`, `program`, `checker` and `report({ node, messageId, data })`. The command walks each file once and calls each visitor of each rule that is on for the file. Messages keep the `{{name}}` placeholders of today. A report is at `node.getStart(sourceFile)`.

The typed rules move from the TypeScript 6 API to the TypeScript 7 API: `type.getCallSignatures()` becomes `checker.getSignaturesOfType(type, SignatureKind.Call)`, `type.isUnion()` becomes `isUnionType(type)` and `getTypes()`, a declaration comes from `signature.declaration.resolve()`, and `esTreeNodeToTSNodeMap` goes away. A rule can pre-filter a declaration on `NodeHandle.path` with a test that ignores case, and it tests its options (for example `declaredIn`) on the `fileName` of the resolved source file, so that macOS and the Linux CI agree.

### The directive reads comments, not text

The command collects the comments of a file from the text outside of the literal tokens of its AST (strings, templates, regular expressions and JSX text), thus a directive in a string or a template is not a directive. A directive is `typecheck-disable-next-line <ids> -- <reason>` in a `//` or a `/* */` comment. It suppresses the reports of the named rules whose node starts on the line after the last line of the comment, and each suppressed id is marked used. The command reads the directives of each file that the rules visit, also where no rule is on, so an id that is off or unknown is an unused directive. After the rules run, a directive with no reason, with no id, or with an id that suppressed nothing is a `typecheck-disable` problem at the start of the comment. A problem of a directive with no reason does not undo its suppression, so one mistake gives one line and not a rule report plus a directive problem. ESLint with `eslint-comments/require-description` behaves the same way: the directive disables, and the missing description is the error. The exit status is 1 in both designs.

The directive works for each rule, with a reason. That differs from `directive-guard`, which refuses an inline disable of an `@inflexa-ai/` oxlint rule: the issue asks for the reason form for the typed rules, and the reason keeps the exception in review.

### The rule tester serves each case as a virtual file

`createRuleTester({ fixtures })` returns `run(name, rule, { valid, invalid })`. It opens one `API` per `run` in the fixture folder, whose tsconfig includes the case file names, and serves the code of the current case through the `readFile`, `fileExists` and `getAccessibleEntries` callbacks. Each case takes a new snapshot after `clearSourceFileCache()`, runs the rule through the same engine as the command, and compares the reports. `RuleTester.describe` and `RuleTester.it` take the functions of the test framework, as the tester of oxlint does. The tester closes the process after the last case.

### must-use-result is a port to the TypeScript AST

The port keeps the structure of `src/rules/must-use-result.ts` of `@ninoseki/eslint-plugin-neverthrow` 0.3.2 (`tmp/claude/ninoseki/`): the selector over calls, `new` and `await`, `isResultLike` through the apparent type and its union, the handled methods, the `safeTry` check, the `combine` check, the return check, and the variable check. It maps ESTree to the TypeScript AST: a `ParenthesizedExpression` sits between nodes where ESTree has none, an optional chain is a flag of the access or the call and not a `ChainExpression`, a class field is a `PropertyDeclaration`, and the references of a variable come from `getReferencesToSymbolInFile` in place of the scope manager. The extensions of the inflexa wrappers (`harness/eslint.config.js` and `patches/eslint-plugin-neverthrow@1.1.4.patch` in `inflexa3`, and the configurations of cli, prov-kernel, cortex and bench) join the port as the spec lists them.

The upstream case `if (res.isOk) {}` is invalid upstream and valid here, because the inflexa extension counts a read of `isOk` and `isErr` as a use. With `strictNullChecks`, `tsc` already reports that condition as a function that is always defined (TS2774), and the document of the rule says so.

The port keeps the upstream decisions that the spec names: `isReturned` and `getAssignation` walk up to the nearest block, an expression whose parent is a type assertion or a non-null assertion is left out, and an unused value is reported at the expression that gives it, not at the variable name (upstream reassigns `reportAs` only inside `handleAssignation`).

### require-abort-signal, no-inline-query-key: the same logic on the new API

Each rule keeps its checks, messages and options. The test cases of today move to the new tester with their results, and the tests that expected a thrown error without type information go away.

### no-generated-empty-object-type and no-void-query-fn are ports

`no-generated-empty-object-type` visits `IntersectionType`, and `TypeReference` nodes with type arguments whose parent is not an intersection, and reads the type of the node with `getTypeAtLocation`. It tests the object flags against `Class | Interface`, the properties, the index infos, the call and construct signatures, and the assignability of `number` and `string`, as upstream does. The cases come from the upstream test (`tmp/claude/upstream/no-generated-empty-object-type.test.ts`).

`no-void-query-fn` visits `PropertyAssignment`, `ShorthandPropertyAssignment` and `MethodDeclaration` named `queryFn` in an object literal, as the `Property` visitor of ESTree does. The API has no `getAwaitedType`, thus the rule gets the promised type of a thenable as the checker does: the first parameter of the `onfulfilled` callback of `then`, again while the result is a thenable. It tests `void` and `undefined` by `TypeFlags` on each member of a union. The cases come from `tmp/claude/upstream/no-void-query-fn.test.ts`.

### The oxlint rules use @oxlint/plugins

The syntax rules take `Rule`, `Context` and `ESTree` from `@oxlint/plugins`, and compare `node.type` with string literals in place of `AST_NODE_TYPES`. The plugin objects are `Plugin` values, and the tests run the rules in the `RuleTester` of `oxlint/plugins-dev` with no cast, thus the SAFETY casts and their lint exceptions go away. `@oxlint/plugins` is a dependency of both oxlint packages, because their published declarations name its types.

### directive-guard reports every eslint-disable

`findArchitectureDirectiveViolations` reports each `eslint-disable` directive with one message, whatever it names, and keeps the prefix and the inline rules for `oxlint-disable`. The oxlint factory keeps `respectEslintDisableDirectives: false`, so oxlint does not obey a stray `eslint-disable` either.

### The workspace moves to TypeScript 7

`typescript` 7.0.2 installs at the root with its platform binary. The `typecheck` scripts keep `tsc`, which is now the native compiler. `npm run lint` becomes `lint:oxlint && lint:typecheck && lint:directives`, and `lint:typecheck` runs `node --conditions=source typecheck/src/cli.ts` with a `-p` for each package and for the workspace root, whose `tsconfig.json` also includes `typecheck.config.ts`.

### The packages release together at 0.4.0

The packages share one version, and this change moves it to 0.4.0, because the removal of `./eslint` breaks consumers. Without a new version, the change of the manifests still starts `release-oxlint.yml`, which finds 0.3.0 on npm for the oxlint packages and tries to publish the new package at 0.3.0. The change of issues 8 to 11 released 0.3.0 the same way. `scripts/release.mjs` publishes `typecheck`, then `typescript`, then `react`, writes the shared version into each dependency and each peer dependency on a package of the workspace, stages `NOTICE` where a package has one, and its smoke test runs `inflexa-typecheck` in the scratch project on a type error and a type that resolves to `{}`, in place of the load of the ESLint entry. `release-oxlint.yml` also runs on a change of `oxlint/typecheck/package.json`, and its header comment and the comment of `respectEslintDisableDirectives` in `typescript/src/index.ts` stop naming ESLint as a reader.

### The measurement

The implementation runs, on `/Users/s-ved/repos/inflexa/inflexa3/harness` and `/Users/s-ved/repos/inflexa/himmel`, `tsc --noEmit` 6, `tsc --noEmit` 7, the ESLint run of today, and `inflexa-typecheck` with a scratch configuration that turns on the typed rules of each repository (harness: `must-use-result` with its `consumers`; himmel: the typed rules of its `eslint.config.js`). The implementor writes the numbers and the command lines to `tmp/claude/issue16-measurements.md`, and the coordinator copies them into the section below before the sync. The runs are read-only in those repositories.

## Measurements

macOS on Apple silicon, Node 24.21.0, wall time, the mean of the runs. Each run was read-only in the measured repository. `tsc` 6 is the TypeScript 6.0.3 of each repository, `tsc` 7 is the TypeScript 7.0.2 of this workspace, and `inflexa-typecheck` ran from the source of this branch with a scratch configuration that turns on the typed rules of the repository.

| Repository | `tsc --noEmit` 6 | `tsc --noEmit` 7 | ESLint of today | `inflexa-typecheck` |
| --- | --- | --- | --- | --- |
| harness, `-p tsconfig.eslint.json` | 4.9 s | 0.8 s | 13.5 s (`eslint .`) | 5.2 s |
| harness, `-p tsconfig.json` | 3.4 s | 0.6 s | | 2.8 s |
| himmel, the 13 projects of `npm run typecheck` | 12.7 s | 2.5 s | 7.2 s (`eslint . --max-warnings 0`) | 3.8 s |

- harness: the run with no rule takes 1.7 s, `no-generated-empty-object-type` adds 0.7 s, and `must-use-result` adds 2.7 s, which is one checker round trip for each call, `new` and `await` of the own files. The diagnostics are the same bytes as those of `tsc` 7. `must-use-result` gives 65 reports where the patched `eslint-plugin-neverthrow` 1.1.4 gives none: most are statements that await a call that gives a `Result` (upstream 0.3.2 examines `await`, 1.1.4 does not), 3 are assignments to a variable declared earlier (upstream 0.3.2 follows only a declaration), and 2 carry an `eslint-disable` directive that the command does not read.
- himmel: no line and exit 0, as today. With the override that turns `no-inline-query-key` off for one test file removed, the command reports the inline keys of that file, which shows that the rules run.
- Command lines and the single runs: `tmp/claude/issue16-measurements.md` (scratch, not in the repository).

## Risks / Trade-offs

- [A patch of TypeScript changes the unstable API] → The peer range is the exact version that CI installs, and a Dependabot update of `typescript` fails the tests until the code follows.
- [Each checker call is a round trip] → One walk per file, the handle path before `resolve()`, and the measurement on harness and himmel before the release.
- [A declaration in a large library file costs a fetch of its AST] → A rule reads `NodeHandle.path` first, and resolves only a declaration that it needs to read.
- [A problem matcher keyed on `TS<digits>` misses rule reports] → The README states the format of a rule report.
- [An inline directive can switch off a typed architecture rule] → The reason is mandatory and the review sees it.
- [npm accepts a trusted publisher only for a package that exists] → The first publication of `@inflexa-ai/typecheck` is local, after the merge, as the README of `oxlint/` already says for each new package.
- [The third-party JS plugins keep `eslint` and a nested TypeScript 6 in the tree of a consumer] → They are dependencies of those plugins, and no package of this repository imports them.

## Migration Plan

The merge into `main` starts `release-oxlint.yml`, which cannot publish `@inflexa-ai/typecheck`, because npm has no trusted publisher for a package that does not exist, and the script stops at that first package. A local `node scripts/release.mjs --publish` from `main` then publishes each missing package and tags the release, and a trusted publisher for the new package follows. Each consumer then follows the "After the release" list of the issue. A consumer that stays on 0.3.0 keeps ESLint.

At the sync, the coordinator also rewrites the Purpose of `openspec/specs/typed-rules/spec.md`, `openspec/specs/directive-guard/spec.md` and `openspec/specs/lint-rule-documentation/spec.md`, which a delta cannot change.
