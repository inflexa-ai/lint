# anyapi

Give an exported API a type that states its shape.

## Why

A parameter, a result or a field of type `any` or `map[string]any` tells the caller nothing about its content. Each caller must guess the shape and check it at run time. A struct or a named type states the shape once, and the compiler checks each use.

## What the rule reports

- An exported function or an exported method of an exported type, with a parameter or a result of type `any` or `map[string]any`.
- An exported field of an exported struct type, with the type `any` or `map[string]any`.
- An exported method of the method set of an exported interface type, with a parameter or a result of type `any` or `map[string]any`. The method set includes the methods of each embedded interface. The rule reports a method of the same package at its declaration, one time. It reports a method of another package of the same module at the embedded type that gives it. A method of another module, for example `Value(key any) any` of an embedded `context.Context`, gets no report, because the repository cannot change it.

## What the rule leaves alone

- A variadic `...any` parameter. It is the convention of `fmt` and `log/slog`.
- An unexported function, method, type or field.
- A named type whose underlying type is a map, for example `types.JSONMap`.
- A method of `exempt-methods`, for example `Scan` of `sql.Scanner`.
- A type parameter with the constraint `any`.

The base configuration skips test files, because a test function is not an exported API. A repository that declares its named map types in one package can skip that package in its overlay.

## Settings

- `exempt-methods` — the method names that the rule leaves alone. Default: `Scan`.
