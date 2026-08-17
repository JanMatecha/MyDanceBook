# ADR 0004: Session Undo uses expected-current-value preconditions

- Status: Accepted
- Date: 2026-08-17

## Context

Session Undo is intentionally lightweight and non-persistent. A naive inverse command can nevertheless overwrite a newer edit from the other member: after `A → B`, another session may write `B → C`, and an unconditional Undo would incorrectly write `C → A`.

## Decision

Every automatically applicable inverse records the bounded target, pre-command value `A`, and expected post-command value `B`.

Undo may apply `B → A` only through an atomic conditional command whose relevant current value still equals `B`.

- If the precondition matches, the inverse is applied as a normal new command.
- If it does not match, the Undo item is refused and conservatively invalidated; the current value remains unchanged.
- The UI explains that the change cannot be safely undone because the value changed after the original action.
- A multi-field/task inverse applies only when all recorded relevant preconditions match; it must not partially undo an atomic original command.
- Redo follows the same expected-current-value principle where offered.

This is a narrow compare-and-apply precondition, not persistent history, object revision infrastructure, semantic merge, or a general optimistic-concurrency system. Normal same-field saves may still use last-successful-write semantics.

## Consequences

Session Undo cannot blindly destroy an obvious newer value. Some Undo items become unavailable after concurrent or external changes, which is preferable to silently overwriting them. The application-command boundary must support small conditional inverse operations even though normal writes do not require global object versions.
