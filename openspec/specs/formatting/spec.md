# formatting Specification

## Purpose

oxfmt formats the workspace of the lint packages, with the settings that the repositories of Inflexa share.

## Requirements

### Requirement: oxfmt formats the workspace

`oxlint/.oxfmtrc.json` SHALL set `printWidth: 180`, `semi: false` and `singleQuote: true`, and SHALL ignore `dist/`, `coverage/` and `package-lock.json`. `npm run format` SHALL format the workspace, and `npm run format:check` SHALL fail when a file is not formatted.

#### Scenario: A formatted workspace

- **WHEN** a developer runs `npm run format:check` from `oxlint/`
- **THEN** the run exits successfully
