# class-constant-name

Give a module constant that holds Tailwind classes a name that ends in `_CLASSES`.

## Why

The Tailwind rules of `eslint-plugin-better-tailwindcss` find the classes in a variable by the name of the variable only. The `tailwind` option of `react()` adds each name that ends in `_CLASSES` to the default names of the plugin. Thus the plugin lints `const RAIL_CLASSES = 'w-[13px]'`, but it does not lint `const RAIL_BUTTON = 'w-[13px]'`. A class in `RAIL_BUTTON` then goes to the screen, and no Tailwind rule reads it.

The suffix is fixed. A repository cannot change it, because the selectors of the preset and this rule must use the same name.

## What the rule reports

A module `const` whose name does not end in `_CLASSES`, when each of these is true:

- An identifier that refers to the constant is in a class position. A class position is the value of a `class` or `className` attribute. An argument of a class function is also a class position. The class functions are the default callees of the plugin: `cc`, `clb`, `clsx`, `cn`, `cnb`, `ctl`, `cva`, `cx`, `dcnb`, `objstr`, `tv`, `twJoin` and `twMerge`.
- The value of the constant is a string literal, a template literal or an object literal. The rule sees the value through `as`, `satisfies`, `!` and `<T>`.

The rule follows a position through a conditional, a logical expression, a template, an array, a spread and an optional chain. A member expression counts through its root, thus `cn(LOOKS[look].course)` is a use of `LOOKS`.

The rule reports each constant one time, at its declaration. The message gives the new name: the old name in upper snake case, with `_CLASSES` after it.

A default name of the plugin, `className`, `classNames`, `classes`, `style` or `styles`, passes with a string or template value. The default selectors of the plugin match a string value only. Thus `const styles = { a: 'flex' }` gets a report.

## What the rule leaves alone

- A `const` in a function. The plugin lints by name, and a rename of each local constant is noise.
- An imported constant. The rule reads one file, and the declaration is in a different file.
- A value of a different kind, for example an array literal or a function.
- A constant that goes only into other positions, for example `aria-label`, or into a call of a function that is not a class function.
- A computed key of a member expression, for example `KEY` in `LOOKS_CLASSES[KEY]`.

## Options

None.
