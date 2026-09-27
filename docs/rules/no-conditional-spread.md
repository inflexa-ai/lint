# no-conditional-spread

Write a property directly. Do not spread a conditional object into an object literal to set one property.

## Why

`...(value === undefined ? {} : { key: value })` is a property assignment written as a puzzle. The reader evaluates a ternary and two object literals to learn that `key` is set when `value` exists.

The shape spreads through a codebase because it always type-checks and never looks wrong in isolation.

Here, a missing key and a key with the value `undefined` mean the same, because `exactOptionalPropertyTypes` is off. Thus the direct form `{ key: value }` is correct when its value can be `undefined`.

A rare object truly must miss the key, for example a `Headers` init or a strict JSON body. Then build the object in a named variable and add the key inside an `if`.

## What the rule reports

- A spread of a ternary inside an object literal, as in `...(active ? { key: value } : {})`.
- A spread of a logical expression inside an object literal, as in `...(error && { message })`.
- A spread with an empty object as the fallback, as in `...(value ?? {})`. The spread of `undefined` or `null` into an object is a no-op, so the fallback does nothing. Spread the value itself.

When one branch holds the properties and each other branch holds nothing, the message shows the properties written directly.

## What the rule leaves alone

- A spread into an array or into a call argument. There is no property to write instead.
- A spread of a value that is not conditional.
