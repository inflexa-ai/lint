# rawhttp

Build an HTTP client and read a request body only in the approved packages.

## Why

When each package builds its own `http.Client`, each client has its own timeouts, tracing and error-body handling, or none. A raw read of a request body skips the size limit and the decode errors of the shared helper. One approved client package and one approved body package keep these rules in one place.

## What the rule reports

- A composite literal of type `net/http.Client`, for example `&http.Client{Timeout: t}`, in a package whose import path starts with no entry of `client-packages`.
- A call of `json.NewDecoder` or `io.ReadAll` whose argument is the `Body` field of a `*http.Request`. The rule reports it in a package whose import path starts with no entry of `body-packages`.

forbidigo reports `http.Get`, `http.Post`, `http.PostForm`, `http.Head` and `http.DefaultClient`. Thus no line gets two reports.

## What the rule leaves alone

- The same code inside an approved package.
- A read of `resp.Body` from an `*http.Response`.

The base configuration skips test files.

## Settings

- `client-packages` — the import path prefixes of the packages that can build an `http.Client`. Default: none.
- `body-packages` — the import path prefixes of the packages that can read a request body. Default: none.

The base configuration does not turn on the rule, because the rule needs the approved packages of the repository. A repository turns on the rule in its overlay, together with its `client-packages` and `body-packages`.
