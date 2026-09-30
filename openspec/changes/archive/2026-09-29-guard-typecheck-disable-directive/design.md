# Design

## Context

`findArchitectureDirectiveViolations` in `oxlint/typescript/src/directives/architecture-directives.ts` matches two patterns over the source text: `LINE_DIRECTIVE` for `//` comments and `BLOCK_DIRECTIVE` for `/* */` comments. Both share the keyword alternation `(?:es|ox)lint-disable` followed by the optional suffix `(?:-next-line|-line)` and the lookahead `(?![\w-])`, which rejects a longer word such as `eslint-disabled` and a typo such as `oxlint-disable-next`. The keyword is the captured base form, so the code knows the family but not the suffix that the file carried.

The dispatch after a match has two branches. The `eslint-disable` family gets one report each, because no tool reads it. The `oxlint-disable` family gets the rule-list parse: the reason after ` -- `, the comma-separated rules, the guarded prefixes, the `inlineAllowed` list, and the blanket report for a directive that names no rule.

`inflexa-typecheck` reads the directive `typecheck-disable-next-line <ids> -- <reason>` from a line comment or a block comment whose text starts with the keyword. A directive with no id, with no reason, or with an id that suppressed nothing is a `typecheck-disable` problem at the comment, and a directive with no ids suppresses nothing. The command collects comments from the text outside the literal tokens of the AST, so a directive in a string is not a directive. The guard reads raw text and accepts that directive text in a string literal matches; its doc comment records that trade-off.

The self-lint run `npm run lint` from `oxlint/` runs the guard over the workspace source with `--ignore "typescript/src/directives/test/**"` and must report zero messages. The directive text in the workspace source outside that folder names only the unprefixed typed rule ids of the typecheck tests, so the new matches stay silent there.

See proposal.md for the motivation and specs/directive-guard/spec.md for the required behavior.

## Goals / Non-Goals

**Goals:**

- One dispatch rule that covers all three keyword families, with the live forms of each family policed the same way.
- Messages that stay true for each form: what the file carries is what the report names and what the hint suggests.

**Non-Goals:**

- No change to `inflexa-typecheck` or its directive handling; the typecheck command keeps its own refusal of a directive with no id, no reason, or an unused id.
- No guard report for `typecheck-enable`, `eslint-enable` or `oxlint-enable`: an enable suppresses nothing in every tool.
- No new command-line option, no change to the prefixes mechanism, and no version bump; the release process of the workspace owns versions.
- No change to the `oxlint-configuration` capability: its statement that each tool reads its own form stays true.

## Decisions

### One pattern pair with a captured suffix

Both patterns extend the keyword alternation to `(?:(?:es|ox)lint|typecheck)-disable` and capture the suffix as a second group. The base keyword gives the family; the keyword plus the suffix gives the form that the file carries. The negative lookahead keeps the typo forms out, as today.

A directive is live when a tool reads its form: every `oxlint-disable` form, and `typecheck-disable-next-line`. Every other matched directive is dead: the whole `eslint-disable` family, and `typecheck-disable` with no suffix or with `-line`. Live forms go through the rule-list parse; dead forms get one report each.

Alternative: match only `typecheck-disable-next-line` and leave the other typecheck forms invisible. Rejected: a `typecheck-disable` or `typecheck-disable-line` directive suppresses nothing, so it misleads the next reader exactly as an `eslint-disable` does, and the guard's doctrine is that no such directive stays in the source.

### A blanket `typecheck-disable-next-line` gets no guard report

The rule-list parse reports an `oxlint-disable` directive that names no rule, because oxlint obeys it and it switches off the architecture rules. A `typecheck-disable-next-line` directive that names no rule switches off nothing: `inflexa-typecheck` refuses it with a `typecheck-disable` problem at the comment. The guard reports nothing for it.

Alternative: report it under the names-no-rule branch. Rejected: the blanket message would state a falsehood for that form, and a second, weaker message would duplicate the report that `inflexa-typecheck` already prints at the same line. The spec pins this silence with a scenario.

### Messages name the form that the file carries

The dead-form report interpolates the keyword and suffix that the match captured, for example `typecheck-disable-line`, and keeps the advice to write `oxlint-disable` for an oxlint rule or `typecheck-disable-next-line` for a typed rule. The inline-allowed hint suggests the captured form, so a directive that used the typecheck form gets a hint with `typecheck-disable-next-line`; a hint with the bare keyword there would suggest a form that no tool reads. The blanket report keeps the base keyword, because it fires only for the oxlint family.

Alternative: one message per family with the family keyword only. Rejected: it either restates the same sentence twice or suggests a dead form in the hint.

### No parser for the guard

The guard keeps reading raw text. The typecheck command needs the AST to tell a comment from directive text in a string, but the guard's protection does not depend on that distinction: text that looks like a live directive naming a guarded rule is a report either way, and the doc comment records the string-literal trade-off. Adding the TypeScript parser to the guard would couple the guard to a project's program for no protection gain.

Three raw-text divergences from the typecheck command stay out of the spec, and the doc comment that task 2.2 updates folds them into the same trade-off passage. The guard matches `typecheck-disable-next-line` followed directly by a rule id with no space, which the typecheck command refuses, so the guard reports an inline disable that suppresses nothing; the report still points at the right fix, because a malformed directive is no route to silence. The line pattern admits the Unicode whitespace between `//` and the keyword, without the `\r` and `\n` terminators, because the command trims a comment's text and so still starts a directive after such whitespace; a reviewer demonstrated the closed gap with a no-break space between `//` and the keyword. A directive that only a stray CR or a line-separator character lets through hides no suppression, because the compiler fails such a file. For the oxlint family the widened class over-reports a directive across the exotic whitespace that oxlint ignores, an accepted trade-off because the over-report is the safe direction. The guard cannot match a directive in a block comment that never closes, while the typecheck command reads that comment to the end of the file; a file with an unterminated comment fails the compile, so it reaches no merge.

### The READMEs describe the forms, not the decision history

`oxlint/README.md` extends its paragraph about the directive forms: `inflexa-typecheck` reads the next-line form only, so the other typecheck forms join the `eslint-disable` forms among the directives that the guard reports. `oxlint/typescript/README.md` extends its line about the guard to both tools' live forms. The issue offered a README record as the alternative when the behavior is on purpose; the proposal resolves that fork the other way, so the READMEs only describe the new behavior.

## Risks / Trade-offs

- [A consumer build carries a dead typecheck form or an inline typecheck exception for a typed `@inflexa-ai/` rule, and the new reports fail it] → That directive already suppresses nothing or moves an exception out of review, so the report is the guard working. The release notes carry the BREAKING marks, and the escape hatches stay: move the exception into the configuration, or name the rule with `--allow-inline` and give the reason.
- [The new patterns match directive text in string literals of the workspace, and the self-lint fails] → The self-lint run is part of the verification; the only new matches in the workspace name unprefixed typed rule ids, which the guard ignores. A future string that matches gets caught by `npm run lint` before release.
- [The new test blocks read like the `eslint-disable` block, and jscpd reports a clone] → Each new test block asserts a different message or a different silence, which keeps the token distance above the clone threshold; `npm run lint` fails otherwise.

## Migration Plan

No migration in this repository. A consumer that adopts the release moves each inline typecheck exception for a guarded rule into its lint configuration, or lists the rule with `--allow-inline` and keeps the reason after ` -- `, and removes each `typecheck-disable` and `typecheck-disable-line` directive, which suppresses nothing today. Rollback is a revert of the source change; the command has no stored state.

## Open Questions

None.
