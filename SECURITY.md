# Security policy

## Supported versions

Security fixes go into the latest release of each package. We do not backport a fix to an earlier release.

## Report a vulnerability

Do not report a vulnerability in a public issue, pull request, or discussion. A public report before the fix puts the users at risk.

Use one of these channels:

- **GitHub private vulnerability reporting.** Open the **Security** tab of this repository, then select **Report a vulnerability**. This is the preferred channel.
- **Email.** Send the report to **security@inflexa.ai**. To encrypt the report, ask for our PGP key first.

Give this information in the report:

- the package and its version
- a description of the issue and its security impact
- the steps to reproduce the issue, and a minimal proof of concept if possible
- the logs or the output, with the secrets and the private data removed

## What to expect

- We acknowledge the report in 3 business days.
- We fix the issue on a schedule that agrees with its severity. We agree on the disclosure date with you.
- If you agree, we credit you in the advisory and in the release notes.

## Scope

The packages of this repository run on the computers of developers and in CI. These issues are in scope:

- A rule, a plugin, or a tool of this repository that runs code from the source that it lints.
- A rule, a plugin, or a tool of this repository that writes outside the project, or sends data over the network.
- An issue that affects the integrity of the published npm packages or of the Go module.
- A vulnerability of a dependency, with a demonstrated path through a package of this repository.

These issues are out of scope:

- A false positive or a false negative of a rule. Report it as a bug.
- An issue that needs a host that is already compromised.
- A vulnerability in oxlint, ESLint, golangci-lint, or the Go toolchain. Report it to that project.

## Safe harbor

We support security research in good faith. We will not start or support legal action against a researcher who obeys these conditions:

- The researcher does tests only on their **own** installations and data.
- The researcher does not break the privacy of a person, destroy data, or make the software worse for other users.
- The researcher does not access, change, or copy data that is not theirs.
- The researcher gives us a reasonable time to fix the issue before public disclosure.

## Disclosure

We publish each confirmed vulnerability as a GitHub Security Advisory when the fix is available.
