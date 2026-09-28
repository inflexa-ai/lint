# solid-require-cleanup

This document is for the rule `@inflexa-ai/solid/require-cleanup`. Pair each subscription in the body of a component with an `onCleanup` of solid-js in the same body.

## Why

A listener or a timer stays alive after the component that started it stops. Solid does not end it when it disposes of the owner of the component. The handler then runs for a component that no longer exists, and each new copy of the component adds one more handler.

`onCleanup` in the body of the component runs when Solid disposes of the owner. It is the place that ends the subscription.

## What the rule reports

A subscription call in the body of a component, when no `onCleanup` call of solid-js is in the same body.

- A component is a function whose name starts with an uppercase letter, or a function that returns JSX. The name is the name of the function or the name of the variable that the function initializes. The rule `prefer-onSettled-for-side-effects` of `eslint-plugin-solid` uses a similar check, but it reads only the own name of a named function.
- A subscription call is a call of a member named `on`, a call of `addEventListener`, or a call of `setInterval`. The global and the member forms of `addEventListener` and `setInterval` are subscriptions.
- An `onCleanup` call is a call of the named import `onCleanup` of `solid-js`, also under a different local name. A call of `onCleanup` on the namespace import of `solid-js` is also an `onCleanup` call.

A component that is nested in a different component is a component of its own. For example, a render callback of `<For>` that returns JSX must have its own `onCleanup`.

## What the rule leaves alone

- A subscription in a nested function that is not a component, for example an effect, an `onMount` callback, a `ref` callback or an event handler. An effect runs again and must have its own cleanup. An element owns the listeners of its `ref` callback. An event handler runs with no owner. The rule does not examine these functions.
- A subscription in a hook or in a different function that is not a component.
- A subscription at module scope.
- A call of a local binding named `setInterval` or `addEventListener`, for example a parameter or an import.
- A call of `on` on the namespace import of `solid-js`, as in `Solid.on(count, log)`. That `on` is the helper of Solid that makes a tracked callback, not a subscription.

## Limits

One `onCleanup` call satisfies each subscription of its function. The rule does not read the body of the cleanup. Thus when a cleanup ends one subscription and forgets a second one, the rule does not report the second one.

A local binding that has the name `onCleanup` is not the `onCleanup` of solid-js. The rule reports the subscriptions beside it.

The rule reads no types. A call of a member named `on` that is not a subscription, for example a method of a builder, gets a report. Turn the rule off for that file, and give the reason.

## The timer ban of typescript()

`typescript()` bans each raw timer by default, and `solid()` keeps the ban. Thus a `setInterval` in a component gets a report from `eslint-js/no-restricted-syntax`, also when an `onCleanup` ends it. To let a component use a timer, a repository sets `syntax: { timers: false }`. A repository can also turn the ban off in its own blocks for the files of its components.

## Options

The rule has no options.
