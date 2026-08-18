# ADR 0009: Musical phase is zero-based elapsed bar time

- Status: Accepted
- Date: 2026-08-17

## Context

Count labels are human notation, while phase participates in exact rational arithmetic and modulo operations. Storing “count 1” as the numeric fraction `1/1` creates an off-by-one-bar ambiguity at boundaries.

## Decision

Musical phase is elapsed time from the start of a bar in the selected `TimingScheme` beat unit:

- count 1 is `0/1`;
- count 2 is `1/1`;
- count 3 is `2/1`;
- the next bar begins at `barLength`, whose value modulo `barLength` is `0/1`.

Count numbers and labels are presentation metadata and are never persisted as phase values.

## Consequences

Routine phase propagation and entry-constraint comparison use ordinary rational addition and modulo without special boundary cases. UI labels must explicitly translate between zero-based phase and the Scheme's count notation.
