## MODIFIED Requirements

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
