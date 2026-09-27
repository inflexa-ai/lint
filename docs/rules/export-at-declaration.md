# export-at-declaration

Export a declaration where it is declared. Do not collect the public names of a file in an export list at the foot of the file.

## Why

`export { NotFoundPage }` at the foot of a file says, far from the declaration, that the declaration is public. A reader of the function cannot tell whether code outside the file can call it. The reader has to look at the end of the file.

The list drifts. A name that a person removes from the list leaves a declaration that looks exported and is not, or the reverse. `export` on the declaration puts the answer where the question is asked.

## What the rule reports

- A named export list, as in `export { NotFoundPage }`, that names declarations of the same file.
- An exported name that is imported, as in `export { NotFoundPage }`. This file has no declaration of the name to mark. Re-export it from where it comes from, in one statement: `export { NotFoundPage } from './not-found-page'`.
- `export default Page`, which is the same list with one entry. Write `export default` on the declaration itself, or export the name at its declaration.

## What the rule leaves alone

- `export {}`, which exports nothing and only marks the file as a module.
- A re-export with a source, as in `export { z } from 'zod'`. The source is on the line.

## The fix

The rule moves `export` onto each declaration and removes the list. The rule can do that except in these cases:

- A name is renamed on the way out.
- A name is imported.
- A name has no top-level statement of its own to mark.

Then the rule reports only.
