# testplacement

Keep a test in the `tests` folder of its package, or name it as an internal test.

## Why

Some tests sit in a `tests` folder, and others sit beside the code. A reader then cannot find the tests of a package in one place. The name form tells a black-box test from a white-box test. A black-box test goes into the `tests` folder. A white-box test that must reach unexported code stays beside the code and carries the internal suffix.

## What the rule reports

- A `_test.go` file whose directory has a base name other than `tests-dir`, and whose name does not end with `internal-suffix`. The rule reports it at the package clause.

The rule reads file names only.

## What the rule leaves alone

- A test file in the `tests-dir` folder.
- A test file whose name ends with `internal-suffix`.

The base configuration does not turn on the rule, because the Go convention keeps a test beside the code. A repository that keeps its black-box tests in a folder turns on the rule in its overlay. An exclusion rule of the overlay limits the rule to the folders of that repository.

## Settings

- `tests-dir` — the base name of the folder that holds the tests. Default: `tests`.
- `internal-suffix` — the end of the name of a white-box test file. Default: `_internal_test.go`.
