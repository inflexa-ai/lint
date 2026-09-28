# Spec Delta

## MODIFIED Requirements

### Requirement: Each rule has a rationale document

Every exported rule of the plugins `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react` and `@inflexa-ai/oxlint-plugin-solid` MUST have a Markdown document under `docs/rules/`. The document of a rule of the TypeScript plugin or of the React plugin is `<rule name>.md`. The document of a rule of the Solid plugin is `solid-<rule name>.md`, because `docs/rules/` is flat and a Solid rule can have the name of a React rule. The document states the principle the rule enforces, the reason for it, what the rule reports, and what it leaves alone.

#### Scenario: A consumer looks up the rationale for a rule

- **WHEN** a consumer of a plugin reads the message of a reported rule and opens the document for that rule id under `docs/rules/`
- **THEN** the document exists and gives the principle and the reason for the rule, including what the rule does not report

#### Scenario: A Solid rule has the name of a React rule

- **WHEN** a consumer opens the document of `@inflexa-ai/solid/no-raw-context`
- **THEN** the document is `docs/rules/solid-no-raw-context.md`, and `docs/rules/no-raw-context.md` stays the document of `@inflexa-ai/react/no-raw-context`

### Requirement: Each rule links to its document through meta.docs.url

Every exported rule of the plugins MUST declare `meta.docs.url` with the absolute URL of its own document in this repository: `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md` for a rule of the TypeScript plugin or of the React plugin, and `https://github.com/inflexa-ai/lint/blob/main/docs/rules/solid-<rule name>.md` for a rule of the Solid plugin, so an editor or agent that shows the rule id links to the rationale.

#### Scenario: A rule declares its document URL

- **WHEN** the rules export of a plugin is inspected
- **THEN** each rule carries `meta.docs.url`, the URL names the document of that rule under `https://github.com/inflexa-ai/lint/blob/main/docs/rules/`, and no rule lacks the entry

#### Scenario: A rule is added without a document

- **WHEN** the per-package test suite runs
- **THEN** the linkage test fails when a rule has no `meta.docs.url` or the URL does not resolve to an existing document file, so the contract cannot silently regress
