# no-module-mocking

Pass a dependency in. Do not replace its module with a stand-in from the test framework.

## Why

`vi.mock('../db', …)` and `jest.mock` swap a module for a stand-in that the framework builds. The framework hoists the stand-in above the imports, so the test runs a graph that the program never assembles. The mock drifts from the module that it stands for. The hoisting surprises the next reader. The test passes while the real wiring is broken.

Give the test the dependency as a value instead. A hook takes it as an argument. Build the client from an injected `fetch`. Make the store for the test. The stand-in is then a plain value that the test controls, and the code under test runs as it runs in the app.

## What the rule reports

- `vi.mock`, `vi.doMock` and `vi.unstable_mockModule`, and the same methods on `jest`. The rule reads `vi['mock']` as the same call as `vi.mock`.

## What the rule leaves alone

- A binding of one's own that is called `vi`. The rule knows the framework object by what it denotes: `vi` and `jest` from the test globals, and the same names imported from `vitest` and `@jest/globals`.
