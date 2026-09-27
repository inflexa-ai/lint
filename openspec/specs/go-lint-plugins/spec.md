# go-lint-plugins Specification

## Purpose
Each Go analyzer of Inflexa runs in golangci-lint as its own module plugin, so that `//nolint` can name one rule, and each fact of a repository reaches the analyzer as a plugin setting.

## Requirements

### Requirement: One module plugin for each analyzer, under the analyzer name

The package `golint/plugin` SHALL register one golangci-lint module plugin for each analyzer of the module, with `register.Plugin` of `github.com/golangci/plugin-module-register`, under the name of that analyzer: `typedids`, `errtext`, `notfoundguard`, `blankerr`, `boundedfanout`, `detachedctx`, `keyowner`, `rawhttp`, `anyapi`, `testplacement`, `swagsync`. Each plugin SHALL build exactly one analyzer. `GetLoadMode` SHALL return `typesinfo` for each plugin except `testplacement`, which SHALL return `syntax`.

#### Scenario: A directive names one rule

- **WHEN** a configuration enables `errtext` and `notfoundguard`, and a line that both would report carries `//nolint:errtext // the module exports no sentinel yet`
- **THEN** the run reports the `notfoundguard` issue for that line and not the `errtext` issue

#### Scenario: The configured plugins appear as linters

- **WHEN** a configuration holds a `linters.settings.custom.<name>` entry with `type: module` for each of the eleven names, and enables them
- **THEN** `inflexa-lint linters -c <that file>` lists each name among the enabled linters

### Requirement: A plugin decodes its settings and rejects an unknown key

Each plugin SHALL decode the `settings` map of its `linters.settings.custom.<name>` entry into the `Settings` struct of its analyzer, with `register.DecodeSettings`, and pass the result to `New`. An unknown key SHALL stop the run with an error that names the key. An absent `settings` map SHALL give the default settings. A key that is present SHALL replace the default, and an empty list SHALL give an empty set. No plugin SHALL load a package or read a file of the repository at construction.

#### Scenario: A typo in a setting

- **WHEN** the entry of `typedids` holds `settings: {idspackage: example.com/ids}` in place of `ids-package`
- **THEN** `inflexa-lint` stops with an error that names `idspackage`

#### Scenario: An empty list clears a default

- **WHEN** the entry of `detachedctx` holds `settings: {exempt-packages: []}`
- **THEN** the analyzer that the plugin builds exempts no package

#### Scenario: A fact of a repository as a setting

- **WHEN** the entry of `keyowner` holds `settings: {keys: [{prefix: iam_maintenance, owner: example.com/svc/modules/iam}]}`
- **THEN** the analyzer that the plugin builds reports the literal `"iam_maintenance"` outside `example.com/svc/modules/iam`
