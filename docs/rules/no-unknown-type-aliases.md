# no-unknown-type-aliases

Keep `unknown` visible. Do not hide it behind an alias.

## Why

`type Payload = unknown` gives `unknown` a domain name and lets it travel as though it were parsed. Every reader believes the name and finds only the top type under it. The alias buys nothing and hides what it costs.

`unknown` belongs in the open. Write it out at the parse boundary and on an error `cause`, so a reader sees that the value is not yet checked.

## What the rule reports

- A type alias whose body is `unknown`.
- A union that includes `unknown`, because it collapses to `unknown`.
- An alias that resolves to another alias of the same file, so a second hop cannot launder the top type.

## What the rule leaves alone

- A name from another file. One file cannot see what it means.
