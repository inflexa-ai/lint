# rawhttp

Build an HTTP client and read a request body only in the approved packages.

## Why

When each package builds its own `http.Client`, each client has its own timeouts, tracing and error-body handling, or none. A raw read of a request body skips the size limit and the decode errors of the shared helper. One approved client package and one approved body package keep these rules in one place.

## What the rule reports

- A value of type `net/http.Client` that a package makes, when its import path starts with no entry of `client-packages`. The rule reads these forms:
  - a composite literal, for example `&http.Client{Timeout: t}`
  - a call of `new(http.Client)`
  - a declaration with no value, for example `var c http.Client`
- A use of the `Body` field of an `http.Request` that can read the body, in a package whose import path starts with no entry of `body-packages`. Examples are `io.ReadAll(r.Body)`, `io.LimitReader(r.Body, n)`, `io.Copy(dst, r.Body)`, `body := r.Body` and `r.Body.Read(buf)`.

forbidigo reports `http.Get`, `http.Post`, `http.PostForm`, `http.Head` and `http.DefaultClient`. Thus no line gets two reports.

## What the rule leaves alone

- The same code inside an approved package.
- A `*http.Client` that the code does not make, for example a parameter, a field or `var c *http.Client`.
- A struct type with a field of type `http.Client`, and a literal of that struct type.
- A use of the request body that does not read it: an assignment to `r.Body`, `r.Body.Close()`, a test of `r.Body` against `nil`, and the argument of `http.MaxBytesReader`.
- A read of `resp.Body` from an `*http.Response`. The client package reads the response, and the rule does not limit the packages that read it.

The base configuration skips test files.

## Settings

- `client-packages` — the import path prefixes of the packages that can build an `http.Client`. Default: none.
- `body-packages` — the import path prefixes of the packages that can read a request body. Default: none.

The base configuration does not turn on the rule, because the rule needs the approved packages of the repository. A repository turns on the rule in its overlay, together with its `client-packages` and `body-packages`.
