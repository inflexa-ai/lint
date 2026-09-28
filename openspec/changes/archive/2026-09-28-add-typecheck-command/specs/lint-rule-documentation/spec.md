# Spec Delta

## MODIFIED Requirements

### Requirement: Each rule has a rationale document

Every exported rule of the oxlint plugins `@inflexa-ai/oxlint-plugin` and `@inflexa-ai/oxlint-plugin-react`, of `@inflexa-ai/typecheck`, and of the typecheck plugin of `@inflexa-ai/oxlint-plugin-react` MUST have a Markdown document under `docs/rules/` named after the rule. The document states the principle the rule enforces, the reason for it, what the rule reports, and what it leaves alone. A ported rule's document names the upstream rule and its license.

#### Scenario: A consumer looks up the rationale for a rule

- **WHEN** a consumer of any of these packages reads the message of a reported rule and opens the document for that rule name under `docs/rules/`
- **THEN** the document exists and gives the principle and the reason for the rule, including what the rule does not report

#### Scenario: A ported rule names its origin

- **WHEN** the per-package test suite reads the documents of `must-use-result`, `no-generated-empty-object-type` and `no-void-query-fn`
- **THEN** each document names its upstream package and the MIT license, and the test fails when one does not

### Requirement: Each rule links to its document through meta.docs.url

Every exported rule of the oxlint plugins, of `@inflexa-ai/typecheck`, and of the typecheck plugin of `@inflexa-ai/oxlint-plugin-react` MUST declare `meta.docs.url` with the absolute URL of its own document in this repository, `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, so an editor or agent that shows the rule id links to the rationale.

#### Scenario: A rule declares its document URL

- **WHEN** the rules export of any of these packages is inspected
- **THEN** each rule carries `meta.docs.url`, the URL is `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, and no rule lacks the entry

#### Scenario: A rule is added without a document

- **WHEN** the per-package test suite runs
- **THEN** the linkage test fails when a rule has no `meta.docs.url` or the URL does not resolve to an existing document file, so the contract cannot silently regress
