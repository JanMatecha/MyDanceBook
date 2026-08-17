# ADR 0005: Step is summary; TechnicalAction is internal process

- Status: Accepted
- Date: 2026-08-17

## Context

Step contains common fields such as `amountOfTurn` and `weightTransfer`, while TechnicalAction can describe rotation or transfer during that Step. Without explicit semantics these could become competing canonical representations.

## Decision

A common Step field is the concise entered summary/result associated with the numbered Step. A TechnicalAction is a timed/internal process or detailed action occurring during that Step.

Examples:

- `Step.amountOfTurn` stores the overall turn associated with the Step; `TechnicalAction(rotation)` stores when and how rotation develops.
- `Step.weightTransfer` stores the concise transfer outcome/state; `TechnicalAction(weight-transfer)` stores its timing and detailed process.

Detailed actions may produce a derived candidate summary. An entered Step summary remains canonical until the user explicitly changes it. Neither layer silently overwrites the other; a clear disagreement can produce `REQUIRES_REVIEW`.

The same summary-versus-detail rule applies to any future common Step field that also has timed process detail. MovementEvent remains for movement not inherently bound to one Step.

## Consequences

The compact Step editor remains useful while detailed timing is representable. Consistency checks need provenance and an explicit derivation rule before comparing summary with action detail.
