import { requireCleanup } from '../require-cleanup.ts'
import { createRuleTester } from './rule-tester.ts'

const ruleTester = createRuleTester()

const missing = (callee: string) => ({ messageId: 'missingCleanup' as const, data: { callee } })

const cleanup = `import { onCleanup } from 'solid-js'\n`

ruleTester.run('require-cleanup', requireCleanup, {
  valid: [
    // A timer with its cleanup.
    `${cleanup}const Spinner = () => { const timer = setInterval(tick, 80); onCleanup(() => clearInterval(timer)); return <text /> }`,
    `${cleanup}function Sidebar() { Bus.on('inflexa', handle); onCleanup(() => Bus.off('inflexa', handle)); return <box /> }`,
    `${cleanup}function Sidebar() { window.addEventListener('resize', fit); onCleanup(() => window.removeEventListener('resize', fit)); return <box /> }`,
    // The cleanup under a different local name, and through the namespace.
    `import { onCleanup as cleanup } from 'solid-js'\nfunction Sidebar() { Bus.on('inflexa', handle); cleanup(stop); return <box /> }`,
    `import * as Solid from 'solid-js'\nfunction Sidebar() { Bus.on('inflexa', handle); Solid.onCleanup(stop); return <box /> }`,
    `import * as Solid from 'solid-js'\nfunction Sidebar() { Bus.on('inflexa', handle); Solid['onCleanup'](stop); return <box /> }`,
    // The import can sit below its use; hoisting makes that legal.
    `function Sidebar() { Bus.on('inflexa', handle); onCleanup(stop); return <box /> }\nimport { onCleanup } from 'solid-js'`,
    // One cleanup ends each subscription of its function.
    `${cleanup}function Parity() { Bus.on('a', first); Bus.on('b', second); const timer = setInterval(tick, 1000); onCleanup(() => { stop(); clearInterval(timer) }); return <box /> }`,
    // A subscription inside a nested function that is not a component has an owner of its own.
    `${cleanup}function Input() { return <input ref={(r) => { r.on('focused', focus) }} /> }`,
    `import { onMount, onCleanup } from 'solid-js'\nfunction Panel() { onMount(() => { window.addEventListener('resize', fit) }); onCleanup(() => window.removeEventListener('resize', fit)); return <box /> }`,
    `import { createEffect } from 'solid-js'\nfunction Dialog(props) { createEffect(() => { props.bus.on('close', close) }); return <box /> }`,
    `function Button() { return <button onClick={() => { setInterval(tick, 100) }} /> }`,
    `function Sidebar() { const watch = () => Bus.on('inflexa', handle); return <box /> }`,
    // A function that is not a component.
    `export async function warmGrammars() { client.on('error', ignore) }`,
    `const register = function attach(target) { target.addEventListener('load', ready) }`,
    `function register(target) { target.addEventListener('load', ready); setInterval(poll, 1000) }`,
    `export function useProfile() { const timer = setInterval(poll, 1000); Bus.on('profile', reload) }`,
    // Module scope.
    `Bus.on('inflexa', handle)\nsetInterval(poll, 1000)\nwindow.addEventListener('resize', fit)`,
    // A local binding that happens to carry the name of a global.
    `function Clock() { const setInterval = (fn) => fn(); setInterval(tick); return <text /> }`,
    `function Page({ addEventListener }) { addEventListener('resize', fit); return <box /> }`,
    `import { setInterval } from './timers.ts'\nfunction Clock() { setInterval(tick, 1000); return <text /> }`,
    // A component with no subscription needs no cleanup, of any module.
    `import { onCleanup } from '@acme/lifecycle'\nfunction Sidebar() { onCleanup(stop); return <box /> }`,
    // The helper `on` of Solid is not a subscription.
    `import * as Solid from 'solid-js'\nfunction Counter() { Solid.on(count, log); return <text /> }`,
    // A call that is not a subscription.
    `function Sidebar() { Bus.off('inflexa', handle); emitter.once('ready', start); return <box /> }`,
  ],
  invalid: [
    // A listener with no cleanup.
    { code: `function Sidebar() { Bus.on('inflexa', handle); return <box /> }`, errors: [missing('Bus.on')] },
    {
      code: `function Sidebar() {\n  Bus.on('inflexa', handle)\n  return <box />\n}`,
      errors: [
        {
          message:
            '`Bus.on` subscribes in the body of a component with no `onCleanup` of solid-js in the same function. Call `onCleanup` beside it, so that the subscription ends when the owner of the component is disposed.',
          line: 2,
          column: 3,
        },
      ],
    },
    // A component by its name: a declaration, a variable, and a named function expression.
    { code: `function Status() { Bus.on('inflexa', handle) }`, errors: [missing('Bus.on')] },
    { code: `const Status = () => { Bus['on']('inflexa', handle) }`, errors: [missing("Bus['on']")] },
    { code: `const Status = function () { Bus.on('inflexa', handle) }`, errors: [missing('Bus.on')] },
    { code: `export const status = memo(function Status() { Bus.on('inflexa', handle) })`, errors: [missing('Bus.on')] },
    { code: `const Status = function helper() { Bus.on('inflexa', handle) }`, errors: [missing('Bus.on')] },
    // A component by the JSX that it returns.
    { code: `const view = () => { Bus.on('inflexa', handle); return <box /> }`, errors: [missing('Bus.on')] },
    { code: `const view = () => <text>{Bus.on('inflexa', handle)}</text>`, errors: [missing('Bus.on')] },
    { code: `export default function () { const timer = setInterval(tick, 80); return <text /> }`, errors: [missing('setInterval')] },
    // Each subscription: a global and a member of each name.
    { code: `function Status() { addEventListener('resize', fit); return <box /> }`, errors: [missing('addEventListener')] },
    { code: `function Status() { window.addEventListener('resize', fit); return <box /> }`, errors: [missing('window.addEventListener')] },
    { code: `function Status() { renderer.addEventListener('resize', fit); return <box /> }`, errors: [missing('renderer.addEventListener')] },
    { code: `function Status() { setInterval(tick, 1000); return <box /> }`, errors: [missing('setInterval')] },
    { code: `function Status() { globalThis.setInterval(tick, 1000); return <box /> }`, errors: [missing('globalThis.setInterval')] },
    { code: `function Status() { props.store.on('change', reload); return <box /> }`, errors: [missing('props.store.on')] },
    {
      code: `function Status() { Bus.on('a', first); window.addEventListener('resize', fit); return <box /> }`,
      errors: [missing('Bus.on'), missing('window.addEventListener')],
    },
    // A cleanup in a different function.
    {
      code: `import { onMount, onCleanup } from 'solid-js'\nfunction Panel() { window.addEventListener('resize', fit); onMount(() => { onCleanup(stop) }); return <box /> }`,
      errors: [missing('window.addEventListener')],
    },
    // A render callback that subscribes is a component of its own.
    {
      code: `function Rows() { return <For each={rows()}>{(row) => { const timer = setInterval(tick, 1000); return <text /> }}</For> }`,
      errors: [missing('setInterval')],
    },
    {
      code: `${cleanup}function Rows() { onCleanup(stop); return <For each={rows()}>{(row) => { row.on('change', reload); return <text /> }}</For> }`,
      errors: [missing('row.on')],
    },
    // A local binding that shadows onCleanup.
    {
      code: `${cleanup}function Sidebar() { const onCleanup = (): void => {}; Bus.on('inflexa', handle); onCleanup(); return <box /> }`,
      errors: [missing('Bus.on')],
    },
    // A cleanup of another module.
    {
      code: `import { onCleanup } from '@acme/lifecycle'\nfunction Sidebar() { Bus.on('inflexa', handle); onCleanup(stop); return <box /> }`,
      errors: [missing('Bus.on')],
    },
    {
      code: `import * as Lifecycle from '@acme/lifecycle'\nfunction Sidebar() { Bus.on('inflexa', handle); Lifecycle.onCleanup(stop); return <box /> }`,
      errors: [missing('Bus.on')],
    },
    // The cleanup of solid-js with no import is a different binding.
    { code: `function Sidebar() { Bus.on('inflexa', handle); onCleanup(stop); return <box /> }`, errors: [missing('Bus.on')] },
  ],
})
