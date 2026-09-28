# no-unknown-parameters

Take a parsed domain type as a parameter. Do not take `unknown`.

## Why

A parameter of type `unknown` moves the work of parsing inward. Every caller sees an unparsed value, and the body narrows the value before it can read it. The value entered the program somewhere with a known shape. That boundary is where a zod schema turns it into a domain type. A function that takes the parsed type states the shape that it works with, and it can trust that shape.

## What the rule reports

- A parameter annotated `unknown`. The rule sees through a rest parameter, a default value and a constructor property.

## What the rule leaves alone

- A parameter named `cause`. The cause of an error is an arbitrary thrown value by contract, so it stays `unknown` on purpose.
- The boundary itself. A request body and a value to serialize are `unknown` exactly where data crosses into the program. Those boundary files belong to the consumer repository, so the consumer excludes them from this rule in its own lint config.
