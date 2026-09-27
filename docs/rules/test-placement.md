# test-placement

Keep a test in a `test/` folder beside the code that it tests.

## Why

A directory lists the modules that a person came to find, not each module followed by its test. The tests of one directory, gathered into a `test/` folder inside it, keep that listing readable. A test stays next to the code that it describes, one level away.

## What the rule reports

- A file that matches the pattern for test files and sits outside the `test/` folder of its own directory. The message names the `test/` folder beside the file.

In the rare case where one file must stay where it is, keep it in place with an inline disable. Write the reason into the disable: `/* oxlint-disable @inflexa-ai/test-placement -- <why this file is the exception> */`.

## What the rule leaves alone

- The question of whether a subject file exists. A test whose subject moved or went away fails on its own. A rule that guessed the subject from the file name would fight every test that covers a folder, a build step or the test setup.

## Options

- `testFilePattern` — the file names that count as tests, as a regular expression. Default: `\\.test\\.[jt]sx?$`.
- `testFolder` — the name of the folder that holds the tests of one directory. Default: `test`.
