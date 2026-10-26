# no-unknown-parameters

Take a parsed domain type as a parameter. Do not take `unknown`.

## Why

A parameter of type `unknown` moves the work of parsing inward. Every caller sees an unparsed value, and the body narrows the value before it can read it. The value entered the program somewhere with a known shape. That boundary is where a zod schema turns it into a domain type. A function that takes the parsed type states the shape that it works with, and it can trust that shape.

## What the rule reports

- A parameter annotated `unknown`. The rule sees through a rest parameter, a default value and a constructor property.

A type parameter that the function uses one time is `unknown` under a different name, as in `function send<T>(body: T)`. `typescript/no-unnecessary-type-parameters` reports it. Thus a type parameter is not a fix.

## What the rule leaves alone

- The parameter of a rejection callback: the callback of `.catch(f)`, and the second callback of `.then(f, g)`. A rejection is an arbitrary thrown value by contract, so it stays `unknown` on purpose.
- A parameter named `cause` that the function passes on as the `cause` option of an error, as in `new UploadError(message, { cause })` or `super(message, { cause })`. The name alone is not sufficient: the rule reports `function render(cause: unknown)`.
- The boundary itself. A request body and a value to serialize are `unknown` exactly where data crosses into the program. Those boundary files belong to the consumer repository, so the consumer excludes them from this rule in its own lint config. A serializer or a logger that takes a value of any shape belongs in such a file.
