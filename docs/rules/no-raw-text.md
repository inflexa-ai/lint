# no-raw-text

Read the text of a screen from a catalog. Do not write text into the JSX.

## Why

Text written into JSX is in one language for every reader. It goes into a catalog and comes back through `t`. A second language is then a second catalog, and no component changes. The checks of the keys also see the text.

## What the rule reports

- JSX text, as in `<p>Hello</p>`.
- A string literal or an empty template literal in a child in braces, as in `<p>{'Hello'}</p>`.
- A literal in a branch of a conditional child, because `{open ? 'Hide' : 'Show'}` is the same text one step further in. The rule also reads the right side of a logical expression, so it reports `{error || 'Fallback'}`.
- A literal in an attribute that a person reads: `alt`, `aria-description`, `aria-label`, `aria-placeholder`, `aria-roledescription`, `aria-valuetext`, `placeholder` and `title`.

Each string counts when it holds a letter of any script. A separator or a number reads the same in every language and has nothing to translate.

## What the rule leaves alone

- A string that reaches the screen through a prop of a component of one's own, as in `description="Nothing runs."`. The prop has a name that the rule cannot know is read. Its type takes the result of `t`, and review sees a literal there.
- The files of the tests. They sit outside the rule in `oxlint.config.ts`, because a test renders a fixture and makes assertions on its text.

## Options

- `hint` — a sentence that names the catalog of this repository. The rule adds it to the message.
