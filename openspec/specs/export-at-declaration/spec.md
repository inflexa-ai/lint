# export-at-declaration Specification

## Purpose

The re-export message of `export-at-declaration` names the module an imported name comes from, for every import form that has one.

## Requirements

### Requirement: The re-export message names the module of the import

When the rule reports an imported name, the message SHALL name the module that the name comes from, and nothing else. For `import x = require('m')` the module is the string of the `require()`.

#### Scenario: An import-equals report carries the require string

- **WHEN** a file holds `import x = require('m')` and exports `x` in a list
- **THEN** the `reExport` message carries `'m'` as the source, and no part of the file text beyond the statement

### Requirement: A namespace alias gets no re-export message

For a name that an import-equals declaration binds to a namespace member (`import x = A.B`), the rule SHALL report no `reExport` message, because no module sits behind the name to re-export from. A list that holds such a name SHALL stay unfixable, as any list with an imported name already is.

#### Scenario: The alias export passes without a message

- **WHEN** a file holds `import x = A.B` and exports `x` in a list
- **THEN** the rule reports nothing for that list
