# Spec Delta

## MODIFIED Requirements

### Requirement: inflexa-typecheck runs the typed rules

`@inflexa-ai/typecheck` SHALL hold the typed rules `must-use-result`, `require-abort-signal` and `no-generated-empty-object-type`. The `./typecheck` entry of `@inflexa-ai/oxlint-plugin-react` SHALL export a typecheck plugin named `@inflexa-ai/react` with the rules `no-inline-query-key` and `no-void-query-fn`. `typecheck()` SHALL turn on `no-generated-empty-object-type` by default, and a repository SHALL turn on each other typed rule in its own overrides. No oxlint plugin of this repository SHALL hold a typed rule. No package of this repository SHALL have an `./eslint` entry or depend on `eslint`, `typescript-eslint` or a package of `@typescript-eslint/`. The React package SHALL name `@inflexa-ai/typecheck` at the shared version as an optional peer dependency, which only its `./typecheck` entry needs, and SHALL declare no `typescript` peer. The typed rules of the React package SHALL import the modules of TypeScript 7 only through `@inflexa-ai/typecheck`.

#### Scenario: A repository runs a typed rule

- **WHEN** a repository turns on `require-abort-signal` with `declaredIn: ['/src/api/']` for `src/**` in `typecheck.config.ts`, and a call into the client carries no `signal`
- **THEN** `inflexa-typecheck` reports the call

#### Scenario: No package has an ESLint entry

- **WHEN** a reader opens the manifests of the packages under `oxlint/`
- **THEN** no manifest exports `./eslint`, and no manifest depends on `eslint`, `typescript-eslint` or a package of `@typescript-eslint/`

#### Scenario: No manifest names TypeScript 7

- **WHEN** a reader opens the `peerDependencies` of each manifest under `oxlint/`
- **THEN** no manifest names `typescript`, and the typed rules of the React package import `@inflexa-ai/typecheck/unstable/ast` and `@inflexa-ai/typecheck/unstable/sync`
