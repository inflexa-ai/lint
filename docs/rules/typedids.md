# typedids

Use the typed ID of an entity. Do not use `uuid.UUID` for it.

## Why

A typed ID such as `ids.UserID` has its own type. The compiler then rejects a user ID where the code expects an organization ID. A field or a parameter of type `uuid.UUID` removes that check. Two IDs of different entities then have the same type, and a mix-up compiles.

## What the rule reports

- A struct field, a function parameter or a function result of type `uuid.UUID` or `*uuid.UUID` from the standard library package `uuid` or from `github.com/google/uuid`. The rule reports it when its name ends with a typed ID name, for example `RevokedByUserID`. It also reports the unexported form of a typed ID name, for example `userID`.
- The message names the typed ID with the package name of `ids-package`, for example `ids.UserID`.

The rule needs no import path from the analyzed package to the typed ID package. `inflexa-lint-config` loads `ids-package` from the repository and writes the names into `.golangci.yml`. Thus a package that does not import the typed ID package, for example a provider client, gets the same check. The names are part of `linters.settings`, which is part of the key of the lint cache. Thus a new typed ID makes golangci-lint analyze each package again. When a new typed ID arrives and nobody runs `inflexa-lint-config` again, `inflexa-lint-config -check` fails.

## What the rule leaves alone

- A name that is not a typed ID name, for example `ResourceID` when the typed ID package declares no `ResourceID` with a `[16]byte` type.
- A parameter or a result with no name.
- A typed ID of another type, for example a string.

## Settings

- `ids-package` — the import path of the typed ID package. The message uses its package name. Default: none. The base configuration does not turn on the rule. A repository turns it on in its overlay, together with this setting.
- `names` — the typed ID names. Default: none. `inflexa-lint-config` writes this setting. It loads `ids-package` from the repository, and it uses each type name of that package with the underlying type `[16]byte`. When the package does not load, `inflexa-lint-config` stops with an error. The plugin loads no package.
