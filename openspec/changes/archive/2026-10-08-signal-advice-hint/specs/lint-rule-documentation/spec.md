# Spec Delta

## ADDED Requirements

### Requirement: A repository can replace the advice to combine signals

`require-abort-signal` and `use-query-signal` MUST take an optional string option `hint`. When `hint` is not empty, the message of the rule MUST hold the hint in place of the advice to combine signals, and MUST keep the rest of its text. The advice to combine signals is the sentence that names `AbortSignal.any`, the sentence with its first browser versions, and the pointer to the rule document. When `hint` is absent or empty, each rule MUST report the same message id, data and text as it reported before it took the option. The document of each rule MUST describe the option.

#### Scenario: A hint replaces the advice of require-abort-signal

- **WHEN** `require-abort-signal` has the option `hint: 'Use signal.withDeadline(ms) or signal.or(...others).'`, and a call into the client carries no `signal`
- **THEN** the message names the problem of the call, holds the hint, keeps the advice of a deadline and of a wrapper, and does not name `AbortSignal.any`

#### Scenario: A hint replaces the advice of use-query-signal

- **WHEN** `use-query-signal` has the option `hint: 'Use signal.withDeadline(ms) or signal.or(...others).'`, and a query function does not read its signal
- **THEN** the message tells the developer to read the signal and pass it on, ends with the hint, and does not name `AbortSignal.any`

#### Scenario: No hint keeps the report

- **WHEN** either rule has no `hint`, or has `hint: ''`
- **THEN** each report has the message id, the data and the text that the rule gave before the option existed
