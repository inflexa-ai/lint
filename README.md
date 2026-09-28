# lint

The shared lint rules of Inflexa, for TypeScript, React, SolidJS and Go.

<a href="https://scorecard.dev/viewer/?uri=github.com/inflexa-ai/lint"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/inflexa-ai/lint/badge" /></a>
<a href="./LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" /></a>

## Packages

- [oxlint](./oxlint/README.md): the npm packages `@inflexa-ai/oxlint-plugin`, `@inflexa-ai/oxlint-plugin-react`, `@inflexa-ai/oxlint-plugin-solid` and `@inflexa-ai/typecheck`, with the lint rules for TypeScript, React and SolidJS, and the command `inflexa-typecheck` for the rules that read types.
- [golint](./golint/README.md): the Go module `github.com/inflexa-ai/lint/golint`, with the lint rules for Go as golangci-lint plugins.
- [docs/rules](./docs/rules/): the principle, the reason and the settings of each rule.

Each package keeps its own tooling in its own folder. The root of this repository holds no tooling.

## Contribute

Read [CONTRIBUTING.md](./CONTRIBUTING.md). To report a vulnerability, obey [SECURITY.md](./SECURITY.md).

## License

This repository uses the Apache License 2.0. Refer to [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
