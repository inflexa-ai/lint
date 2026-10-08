# Spec Delta

## ADDED Requirements

### Requirement: The advice to combine signals names the browsers that run it

Each message of `require-abort-signal` or of `use-query-signal`, and the document of either rule, that advises `AbortSignal.any` MUST name Chrome 116, Edge 116, Firefox 124 and Safari 17.4 as the first versions that ship it. Each of these messages MUST point to the rule document for an older browser. The document of `require-abort-signal` MUST give a form that combines signals with APIs that Chrome 98, Edge 98, Firefox 97 and Safari 15.4 ship, and the document of `use-query-signal` MUST link to that form instead of a copy of it.

#### Scenario: A developer with an older build target reads the advice

- **WHEN** a developer whose build target includes Chrome 111 reads the message of `use-query-signal` or of `require-abort-signal`
- **THEN** the message names Chrome 116, Edge 116, Firefox 124 and Safari 17.4 as the first versions of `AbortSignal.any` and points to the rule document, and the document gives or links to a form that runs in Chrome 111

#### Scenario: Advice to use AbortSignal.any loses its versions

- **WHEN** the per-package test suite of `@inflexa-ai/typecheck` or of `@inflexa-ai/oxlint-plugin-react` runs, and a message or document of one of its rules advises `AbortSignal.any` without one of those versions
- **THEN** the documentation test fails and names the rule and the missing version
