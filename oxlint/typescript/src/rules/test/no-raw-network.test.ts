import globals from 'globals'
import type { RuleTester } from 'oxlint/plugins-dev'
import { noRawNetwork } from '../no-raw-network.ts'
import { createRuleTester } from './rule-tester.ts'

const raw = (name: string) => ({ messageId: 'rawNetwork' as const, data: { name, hint: '' } })

const valid = [
  `import { createTrustedApiClient } from '@acme/api-client/create-api-client'`,
  `import { createFetch } from '@acme/api-client/create-fetch'`,
  // A binding of one's own that happens to share the name is not the global.
  `function run(fetch) { return fetch('/x') }`,
  `import { fetch } from './transport.ts'; fetch('/x')`,
  `const fetch = createFetch(); fetch('/x')`,
  `const options = { fetch: injected }; options.fetch('/x')`,
  // Naming the type is not making a request.
  `type Fetch = typeof fetch`,
  `type Options = { fetch?: typeof globalThis.fetch }`,
  `const name = window[key]`,
  `navigator.clipboard.writeText('x')`,
  // The object a member hangs off is resolved too, so a binding of one's own
  // named for a global is that binding.
  `const navigator = makeNavigator()\nnavigator.sendBeacon('/log', data)`,
  `function send(window) { return window.fetch('/x') }`,
  `const prefetch = 1; const WebSocketLike = 2`,
]

const invalid: RuleTester.InvalidTestCase[] = [
  { code: `fetch('/api/projects')`, errors: [raw('fetch')] },
  { code: `const load = () => fetch('/x'); load()`, errors: [raw('fetch')] },
  // Handing the global to something else is still reaching for it.
  { code: `const transport = fetch`, errors: [raw('fetch')] },
  { code: `new XMLHttpRequest()`, errors: [raw('XMLHttpRequest')] },
  { code: `new EventSource('/stream')`, errors: [raw('EventSource')] },
  { code: `new WebSocket('wss://x')`, errors: [raw('WebSocket')] },
  { code: `window.fetch('/x')`, errors: [raw('window.fetch')] },
  { code: `globalThis.fetch('/x')`, errors: [raw('globalThis.fetch')] },
  { code: `self['fetch']('/x')`, errors: [raw('self.fetch')] },
  { code: `new window.EventSource('/stream')`, errors: [raw('window.EventSource')] },
  { code: `navigator.sendBeacon('/log', data)`, errors: [raw('navigator.sendBeacon')] },
  // `navigator` reached through the global object is the same `navigator`, and
  // the message shows the spelling the reader will find in the file.
  { code: `globalThis.navigator.sendBeacon('/log', data)`, errors: [raw('globalThis.navigator.sendBeacon')] },
  { code: `window.navigator.sendBeacon('/log', data)`, errors: [raw('window.navigator.sendBeacon')] },
  { code: `fetch('/a'); fetch('/b')`, errors: [raw('fetch'), raw('fetch')] },
  {
    code: `fetch('/x'); new WebSocket('wss://x')`,
    options: [{ globals: ['WebSocket'] }],
    errors: [raw('WebSocket')],
  },
]

// The real config declares browser globals, which changes how a reference to
// `fetch` resolves (to a declared variable rather than an unresolved one). The
// rule has to work both ways, so every case runs with and without them.
createRuleTester().run('no-raw-network (globals undeclared)', noRawNetwork, { valid, invalid })

createRuleTester({ globals: globals.browser }).run('no-raw-network (browser globals declared)', noRawNetwork, { valid, invalid })

createRuleTester().run('no-raw-network (hint)', noRawNetwork, {
  valid: [],
  invalid: [
    {
      // The repository names its own client, and the message ends with it.
      code: `void fetch('/projects')`,
      options: [{ hint: 'Build it with createApiClient from @acme/api-client.' }],
      errors: [{ messageId: 'rawNetwork' as const, data: { name: 'fetch', hint: ' Build it with createApiClient from @acme/api-client.' } }],
    },
  ],
})
