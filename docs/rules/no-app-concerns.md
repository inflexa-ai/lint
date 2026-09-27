# no-app-concerns

Keep application concerns out of shared packages.

## Why

A shared package stays usable by every app only while it knows nothing about any one of them. Some things are mounted once per application. A shared package that imports one of them is tied to the single instance of one app, and no other app can use the package.

## What the rule reports

An import from a shared package that matches a concern:

- `@tanstack/query` and `@tanstack/react-query`. Server data belongs to the app. Take the data, and the callbacks that change it, as props.
- `@tanstack/router` and `@tanstack/react-router`. Routing belongs to the app. Take an `href` or a navigate callback as a prop, or let the caller wrap the component in its own link.

## What the rule leaves alone

- Everything that no entry names. The configuration decides where the rule applies and which entries it carries.

## Options

- `also` — more entries, each with a `pattern` as a regular expression and a `reason` for the message. Use it for concerns of one zone: the app workspaces themselves, or a library that one package can use and another cannot.
