# ADR 0008: Etude timing is contextual and never overrides variant timing

- Status: Accepted
- Date: 2026-08-17

## Context

An Etude can provide a training rhythm or tempo context while its occurrences reference central `FigureVariant` definitions that already own their canonical timing context. Treating the container as an override would make the same variant mean different things depending on where it is referenced.

## Decision

Optional `Etude.timingSchemeId` expresses contextual training timing only. It does not relabel or override canonical rational values owned by a referenced `FigureVariant`.

When Etude and variant timing contexts can be converted by an explicit, unambiguous rule, later evaluation may show the converted result. When that conversion is unavailable or ambiguous, evaluation and verification return `CANNOT_YET_VERIFY`; the application never guesses.

Detailed conversion behavior belongs to Phase 4.

## Consequences

Central variants retain one stable temporal meaning. Etudes remain useful before timing is fully formalized, and incompatible contexts remain visible without corrupting stored values.
