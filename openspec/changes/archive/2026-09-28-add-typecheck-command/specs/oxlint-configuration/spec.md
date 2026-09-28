# Spec Delta

## MODIFIED Requirements

### Requirement: Each tool reads its own directive form

The configuration SHALL set `respectEslintDisableDirectives: false` and `reportUnusedDisableDirectives: 'error'`. oxlint then reads `oxlint-disable` directives only, `inflexa-typecheck` reads `typecheck-disable-next-line` directives only, and no tool reads an `eslint-disable` directive.

#### Scenario: An ESLint directive does not silence an oxlint rule

- **WHEN** a file carries `// eslint-disable-next-line @inflexa-ai/no-interface` above an `interface`
- **THEN** oxlint reports `no-interface` for that interface, and `directive-guard` reports the directive
