# Spec Delta

## MODIFIED Requirements

### Requirement: The command reports each inline disable of an architecture rule

The command `directive-guard` of `@inflexa-ai/oxlint-plugin` SHALL report each `oxlint-disable` directive, in its line, next-line and block forms, that names a rule whose id starts with a guarded prefix or that names no rule. The guarded prefix SHALL be `@inflexa-ai/` unless the command gets `--prefix`, which replaces the list. The command SHALL report each `eslint-disable` directive, in its line, next-line and block forms, whatever rules it names and whatever reason it gives, because no tool of this repository reads that form. It SHALL print each report as `file:line:column: message` and SHALL exit with status 1 when it reports anything.

#### Scenario: A directive switches off an architecture rule

- **WHEN** a source file carries `// oxlint-disable-next-line @inflexa-ai/react/no-raw-state`
- **THEN** the command prints the file, the line and the column of the directive, and exits with status 1

#### Scenario: An eslint-disable directive

- **WHEN** a source file carries `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- wire type`
- **THEN** the command reports the directive with a message that no tool reads `eslint-disable`, and exits with status 1

### Requirement: A test file can argue its own placement

The command SHALL accept an `oxlint-disable` directive for `@inflexa-ai/test-placement`, or for each rule that `--allow-inline` names instead, that gives a reason after ` -- `, and SHALL report the same directive without a reason. A blanket directive SHALL stay a report.

#### Scenario: A directive with a reason

- **WHEN** a test file carries `/* oxlint-disable @inflexa-ai/test-placement -- the fixture sits beside it */`
- **THEN** the command reports nothing for that directive
