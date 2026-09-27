import { noModuleMocking } from '../no-module-mocking.ts'
import { createRuleTester } from './rule-tester.ts'

const moduleMock = (call: string) => ({ messageId: 'moduleMock' as const, data: { call } })

createRuleTester().run('no-module-mocking', noModuleMocking, {
  valid: [
    // Other framework calls stand a dependency up without swapping a module.
    `import { vi } from 'vitest'\nconst fetch = vi.fn()`,
    `import { vi } from 'vitest'\nvi.spyOn(clock, 'now')`,
    // A binding of one's own that happens to be named vi is not the framework.
    `const vi = { mock() {} }\nvi.mock('../db')`,
    // jest imported from elsewhere is not the framework object.
    `import { jest } from './helpers'\njest.mock('../db')`,
    // A binding of the program that is called mock is not the framework object of bun:test.
    `const mock = makeMock()\nmock.module('x')`,
    // The method of bun:test is module, not mock.
    `import { mock } from 'bun:test'\nmock.mock('../db')`,
    // mock from another module is not the framework object.
    `import { mock } from './helpers'\nmock.module('../db')`,
    // A namespace of another module is not the framework.
    `import * as v from './helpers'\nv.vi.mock('../db')`,
    // A namespace member that is not the framework object of that module.
    `import * as b from 'bun:test'\nb.vi.mock('../db')`,
  ],
  invalid: [
    { code: `import { vi } from 'vitest'\nvi.mock('../db')`, errors: [moduleMock('vi.mock')] },
    { code: `import { vi } from 'vitest'\nvi.doMock('../db', () => ({}))`, errors: [moduleMock('vi.doMock')] },
    { code: `import { vi } from 'vitest'\nvi.unstable_mockModule('../db', () => ({}))`, errors: [moduleMock('vi.unstable_mockModule')] },
    { code: `import { jest } from '@jest/globals'\njest.mock('../db')`, errors: [moduleMock('jest.mock')] },
    // The computed spelling is the same call.
    { code: `import { vi } from 'vitest'\nvi['mock']('../db')`, errors: [moduleMock('vi.mock')] },
    // Taken from the test globals rather than imported.
    { code: `vi.mock('../db')`, errors: [moduleMock('vi.mock')] },
    // A framework object under a local name is the same object.
    { code: `import { vi as v } from 'vitest'\nv.mock('../db')`, errors: [moduleMock('v.mock')] },
    { code: `import { mock } from 'bun:test'\nmock.module('../db', () => ({ query: fakeQuery }))`, errors: [moduleMock('mock.module')] },
    { code: `import { mock as m } from 'bun:test'\nm.module('../db', () => ({}))`, errors: [moduleMock('m.module')] },
    { code: `mock.module('../db', () => ({}))`, errors: [moduleMock('mock.module')] },
    { code: `mock['module']('../db', () => ({}))`, errors: [moduleMock('mock.module')] },
    // A framework object read off a namespace import is the same object.
    { code: `import * as v from 'vitest'\nv.vi.mock('../db')`, errors: [moduleMock('v.vi.mock')] },
    { code: `import * as g from '@jest/globals'\ng['jest'].mock('../db')`, errors: [moduleMock('g.jest.mock')] },
    { code: `import * as b from 'bun:test'\nb.mock.module('../db', () => ({}))`, errors: [moduleMock('b.mock.module')] },
  ],
})
