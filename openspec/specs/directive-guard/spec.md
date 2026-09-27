# directive-guard Specification

## Purpose

An inline disable directive cannot switch off an architecture rule in silence, in either linter, because a command outside the linters reads the directives.

## Requirements

### Requirement: The command reports each inline disable of an architecture rule

The command `inflexa-architecture-directives` of `@inflexa-ai/oxlint-plugin` SHALL report each `eslint-disable` and each `oxlint-disable` directive, in its line, next-line and block forms, that names a rule whose id starts with `@inflexa-ai/` or that names no rule. It SHALL print each report as `file:line:column: message` and SHALL exit with status 1 when it reports anything.

#### Scenario: A directive switches off an architecture rule

- **WHEN** a source file carries `// oxlint-disable-next-line @inflexa-ai/react/no-raw-state`
- **THEN** the command prints the file, the line and the column of the directive, and exits with status 1

### Requirement: A test file can argue its own placement

The command SHALL accept a directive for `@inflexa-ai/test-placement` that gives a reason after ` -- `, and SHALL report the same directive without a reason. A blanket directive SHALL stay a report.

#### Scenario: A directive with a reason

- **WHEN** a test file carries `/* oxlint-disable @inflexa-ai/test-placement -- the fixture sits beside it */`
- **THEN** the command reports nothing for that directive

### Requirement: The command walks the source files with a bound

The command SHALL check the source files at or below each path that it gets, or below the working directory when it gets none. It SHALL skip `node_modules`, `dist`, `coverage` and `.git`, SHALL leave out each file that an `--ignore` glob matches, and SHALL keep a fixed number of file reads in flight.

#### Scenario: An ignored folder

- **WHEN** the command runs with `--ignore "src/samples/**"`
- **THEN** it reports nothing for a file under `src/samples/`
