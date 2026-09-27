# Contribute to lint

This repository holds the shared lint rules of Inflexa. This guide tells you how to contribute and what to expect.

The [Code of Conduct](./CODE_OF_CONDUCT.md) applies to each person who takes part. The [governance of Inflexa](https://github.com/inflexa-ai/inflexa/blob/main/GOVERNANCE.md) also applies to this repository.

## Contributions that we want

- **Bug reports.** A rule reports correct code (a false positive), or a rule does not report code that breaks its principle (a false negative). A crash of a rule or a tool is also a bug.
- **Rule proposals.** Tell the principle, give an example of code that breaks it, and give the correct form.
- **Documentation.** Each rule has a document that tells its principle and its reason.
- **Code.** Fixes and new rules.

## Before you start

- Search the [issues](../../issues) and the [discussions](../../discussions) before you open a new one.
- Before you write a new rule or a large change, open an issue or a discussion. Then we can agree on the approach before you write the code.

## Make a change

- Fork the repository and make a branch from `main` in your fork. Then open the pull request from that branch.
- Keep each pull request to one logical change.
- Add a test for each change of behavior. A new rule or a changed rule also needs an update to the document of that rule.
- Before you push, run the checks of each package that you changed.

## Developer Certificate of Origin

This repository uses the [Developer Certificate of Origin](https://developercertificate.org/) (DCO) version 1.1. The DCO is a statement that you have the right to submit your contribution under the license of the repository. To agree to it, sign off each commit:

```bash
git commit -s
```

The `-s` flag adds a `Signed-off-by: Your Name <your@email>` line to the commit message. CI does a check of each commit for this line. If you forget the sign-off, run `git commit --amend -s`, or rebase to sign off more than one commit.

Your contributions use the license of the repository, [LICENSE](./LICENSE). Use a name and an email address that you agree to show in the public history.

## Security issues

Do not report a vulnerability in a public issue, pull request, or discussion. Obey the private process in [SECURITY.md](./SECURITY.md).

## Trademarks

The license lets you use, fork, and change the code. The Inflexa name and logo are different. Refer to the [trademark policy of Inflexa](https://github.com/inflexa-ai/inflexa/blob/main/TRADEMARK.md).

## Questions

Open a [discussion](../../discussions), or ask in an issue.
