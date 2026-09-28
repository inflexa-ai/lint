# Proposal

## Why

Two comments in the rule sources of `oxlint/` give a reader wrong facts. The rules work correctly, so only the comments are wrong, but a wrong comment spreads a wrong belief about how the plugin is configured. (#14) The rule documentation repeats the wrong boundary fact of the first comment, so the change corrects the doc sentence too.

## What Changes

- `oxlint/typescript/src/rules/no-unknown-parameters.ts`: drop the stray `^` before the last JSDoc line of the rule comment. The boundary sentence names `extensions/` and the API client, which are the paths of one consumer repository, not of this plugin. The comment now tells the reader to exclude the boundary files of the consumer in the consumer config.
- `oxlint/react/src/rules/store-placement.ts`: move the "No default" comment away from `bannedInStores`, which has a default, to a position where it can only refer to `factorySource`, which has no entry in `DEFAULTS`.
- `docs/rules/no-unknown-parameters.md`: generalize the boundary sentence in "What the rule leaves alone" the same way as the rule comment. The doc no longer names the API client or `extensions/`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No requirement changes: the rules, their messages, and their options keep the same behavior. This change fixes comments only, so the change declares `skip_specs: true`.

## Impact

- Code: comment lines of `oxlint/typescript/src/rules/no-unknown-parameters.ts` and `oxlint/react/src/rules/store-placement.ts` only. No compiled output changes.
- Documents: the boundary sentence of `docs/rules/no-unknown-parameters.md`.
- Tests: none added; the existing suites must stay green.
- Consumers: none. A reader of the rule sources gets correct facts about where `unknown` is allowed and which option has no default.
