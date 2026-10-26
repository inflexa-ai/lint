# directive-guard Specification

## Purpose

An inline directive of either tool cannot switch off an architecture rule in silence, and no directive that no tool reads stays in the source, because a command outside the linters reads the directives.

## Requirements

### Requirement: The command reports each inline disable of an architecture rule

The command `directive-guard` of `@inflexa-ai/oxlint-plugin` SHALL report each `oxlint-disable` directive, in its line, next-line and block forms, and each `typecheck-disable-next-line` directive, in a line comment or a block comment, that names a rule whose id starts with a guarded prefix, or that names a typed rule of `@inflexa-ai/typecheck` by its id, which has no prefix. The list of those ids SHALL hold each rule of the registry of `@inflexa-ai/typecheck`, and a test SHALL compare the list with that registry. The command SHALL report each `oxlint-disable` directive that names no rule, because oxlint obeys such a blanket directive and it switches off the architecture rules. The guarded prefix SHALL be `@inflexa-ai/` unless the command gets `--prefix`, which replaces the list. The command SHALL report each `eslint-disable`, `typecheck-disable` and `typecheck-disable-line` directive, whatever rules it names and whatever reason it gives, because no tool of this repository reads those forms. The message of a report about a form that no tool reads SHALL name the form that the file carries. It SHALL print each report as `file:line:column: message` and SHALL exit with status 1 when it reports anything.

#### Scenario: A directive switches off an architecture rule

- **WHEN** a source file carries `// oxlint-disable-next-line @inflexa-ai/react/no-raw-state`
- **THEN** the command prints the file, the line and the column of the directive, and exits with status 1

#### Scenario: A typecheck directive switches off a typed rule

- **WHEN** a source file carries `// typecheck-disable-next-line @inflexa-ai/react/no-inline-query-key -- the query key is stable here`
- **THEN** the command prints the file, the line and the column of the directive, and exits with status 1

#### Scenario: A typecheck directive switches off a built-in typed rule

- **WHEN** a source file carries `// typecheck-disable-next-line no-lookup-in-loop -- the list is short`
- **THEN** the command prints the file, the line and the column of the directive, and exits with status 1, also when it gets `--prefix`

#### Scenario: An eslint-disable directive

- **WHEN** a source file carries `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wire type`
- **THEN** the command reports the directive with a message that no tool reads the form that the file carries, and exits with status 1

#### Scenario: A typecheck form that no tool reads

- **WHEN** a source file carries `/* typecheck-disable */`
- **THEN** the command reports the directive with a message that no tool reads the form that the file carries, and exits with status 1

#### Scenario: A blanket directive

- **WHEN** a source file carries `/* oxlint-disable */`
- **THEN** the command reports the directive as a blanket that switches off the architecture rules, and exits with status 1

#### Scenario: A typecheck directive that names no rule

- **WHEN** a source file carries `// typecheck-disable-next-line -- the reason stands alone`
- **THEN** the command reports nothing for that directive, because `inflexa-typecheck` refuses it and suppresses nothing

### Requirement: A test file can argue its own placement

The command SHALL accept an `oxlint-disable` or `typecheck-disable-next-line` directive for `@inflexa-ai/test-placement`, or for each rule that `--allow-inline` names instead, that gives a reason after ` -- `, and SHALL report the same directive without a reason. The message of that report SHALL suggest the form of directive that the file carries. A blanket `oxlint-disable` SHALL stay a report.

#### Scenario: A directive with a reason

- **WHEN** a test file carries `/* oxlint-disable @inflexa-ai/test-placement -- the fixture sits beside it */`
- **THEN** the command reports nothing for that directive

#### Scenario: A typecheck directive with a reason

- **WHEN** the command gets `--allow-inline @inflexa-ai/test-placement`, and a file carries `// typecheck-disable-next-line @inflexa-ai/test-placement -- the fixture sits beside it`
- **THEN** the command reports nothing for that directive

#### Scenario: A typecheck directive without a reason

- **WHEN** the command gets `--allow-inline @inflexa-ai/test-placement`, and a file carries `// typecheck-disable-next-line @inflexa-ai/test-placement`
- **THEN** the command reports the directive, and its message suggests `typecheck-disable-next-line @inflexa-ai/test-placement -- <reason>`

### Requirement: The command walks the source files with a bound

The command SHALL check the source files at or below each path that it gets, or below the working directory when it gets none. It SHALL skip `node_modules`, `dist`, `coverage` and `.git`, SHALL leave out each file that an `--ignore` glob matches, and SHALL keep a fixed number of file reads in flight.

#### Scenario: An ignored folder

- **WHEN** the command runs with `--ignore "src/samples/**"`
- **THEN** it reports nothing for a file under `src/samples/`
