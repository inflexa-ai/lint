## MODIFIED Requirements

### Requirement: Each rule links to its document through meta.docs.url

Every exported rule of the two plugins MUST declare `meta.docs.url` with the absolute URL of its own document in this repository, `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, so an editor or agent that shows the rule id links to the rationale.

#### Scenario: A rule declares its document URL

- **WHEN** the rules export of either plugin is inspected
- **THEN** each rule carries `meta.docs.url`, the URL is `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<rule name>.md`, and no rule lacks the entry

#### Scenario: A rule is added without a document

- **WHEN** the per-package test suite runs
- **THEN** the linkage test fails when a rule has no `meta.docs.url` or the URL does not resolve to an existing document file, so the contract cannot silently regress

### Requirement: Each Go analyzer has a rationale document and links to it

Every analyzer of the module `golint/` MUST have a Markdown document `docs/rules/<analyzer name>.md` that states the principle the analyzer enforces, the reason for it, what it reports, what it leaves alone, and each setting with its default. The `URL` of each analyzer MUST be the absolute URL of that document in this repository, `https://github.com/inflexa-ai/lint/blob/main/docs/rules/<analyzer name>.md`, and each diagnostic MUST carry the same URL.

#### Scenario: A consumer looks up a Go rule

- **WHEN** a consumer reads an issue of `typedids` in the output of `inflexa-lint` and opens the URL of the analyzer
- **THEN** the URL is `https://github.com/inflexa-ai/lint/blob/main/docs/rules/typedids.md`, and the document gives the principle, the reason, the reports, what the rule leaves alone, and the `ids-package` setting

#### Scenario: An analyzer is added without a document

- **WHEN** `go test ./...` runs at `golint/`
- **THEN** a linkage test fails when an analyzer has no `URL`, or the URL does not name a file that exists under `docs/rules/`
