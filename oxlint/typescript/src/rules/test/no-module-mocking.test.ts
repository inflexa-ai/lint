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
  ],
})
