# Proposal

## Why

The directive guard reads the `eslint-disable` and `oxlint-disable` directives only. A `typecheck-disable-next-line` directive can therefore switch off a typed rule of `@inflexa-ai/`, for example `@inflexa-ai/react/no-inline-query-key`, inline and with a reason, while the same inline exception for an oxlint rule is a report. The rule that an exception to an architecture rule is a change to the zone is weaker for the typed rules than for the other rules. `inflexa-ai/himmel#23`, which adopts 0.5.0, found this (inflexa-ai/lint#20).

The repository records one directive form for each tool: oxlint reads `oxlint-disable` directives, `inflexa-typecheck` reads `typecheck-disable-next-line` directives, and no tool reads an `eslint-disable` directive (`oxlint-configuration`). The current behavior of the guard is not a recorded decision: the design of the typecheck command gives its directive a reason form for each rule, and says nothing that keeps the form outside the guard. The guard must read the form.

## What Changes

- **BREAKING** The guard reads each `typecheck-disable-next-line` directive, in a line comment or a block comment, with the same treatment as `oxlint-disable`: the rule list after the keyword, the reason after ` -- `, the guarded prefixes, and the rules that `--allow-inline` names. A repository that silences a typed `@inflexa-ai/` rule through the typecheck form must move the exception into its lint configuration, or name the rule with `--allow-inline` and give the reason.
- **BREAKING** The guard reports each `typecheck-disable` and `typecheck-disable-line` directive, whatever rules it names, because `inflexa-typecheck` reads the next-line form only. Each such directive suppresses nothing and misleads the next reader, as each `eslint-disable` directive does.
- The guard does not report a `typecheck-disable-next-line` directive that names no rule: `inflexa-typecheck` refuses such a directive and suppresses nothing, so it is no route to silence. A blanket `oxlint-disable` stays a report, because oxlint obeys it.
- The dead-form message and the inline-allowed hint name the exact directive form that the file carries, so a hint never suggests a form that no tool reads.
- The README of the workspace and the README of `@inflexa-ai/oxlint-plugin` describe the guard over the directive forms of both tools.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `directive-guard`: The guard polices the `typecheck-disable-next-line` directives of the typed rules beside the `oxlint-disable` directives, and reports the `typecheck-disable` and `typecheck-disable-line` forms that no tool reads, beside the `eslint-disable` forms.

## Impact

- Code: `oxlint/typescript/src/directives/architecture-directives.ts` (the directive patterns, the dispatch between the live and the dead forms, the messages) and its test file `oxlint/typescript/src/directives/test/architecture-directives.test.ts`.
- Documents: `oxlint/README.md` (the paragraph about the directive forms) and `oxlint/typescript/README.md` (the line about the guard).
- No change to `inflexa-typecheck`, to the oxlint rules, or to any dependency. The published `directive-guard` command reports more directives; a release that carries this change follows the release process of the workspace.
