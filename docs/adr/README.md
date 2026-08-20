# Architecture decision records

This directory contains only decisions that materially constrain implementation or persisted real data. Accepted ADRs are authoritative for their focused decision; the domain documents remain authoritative for the complete model.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-canonical-rational-time.md) | Canonical rational time uses TimingScheme beat units | Accepted |
| [0002](0002-boundary-state-semantics.md) | FigureFrame-defined entry and chaining-focused exit semantics | Accepted |
| [0003](0003-phase1-sqlite-backup.md) | Minimum safe SQLite backup exists in Phase 1 | Accepted |
| [0004](0004-safe-session-undo.md) | Session Undo uses expected-current-value preconditions | Accepted |
| [0005](0005-step-summary-vs-technical-action.md) | Step summary and TechnicalAction process are distinct | Accepted |
| [0006](0006-floor-creation-requires-dimensions.md) | Floor dimensions are mandatory at creation | Accepted |
| [0007](0007-figure-variant-duplication.md) | FigureVariant duplication creates an independent canonical copy | Accepted |
| [0008](0008-etude-timing-context.md) | Etude timing is contextual and never overrides variant timing | Accepted |
| [0009](0009-musical-phase-origin.md) | Musical phase is zero-based elapsed bar time | Accepted |
| [0010](0010-phase1-technical-baseline.md) | Phase 1 uses one strict TypeScript application with explicit SQLite | Accepted |
| [0011](0011-singleton-pair-and-dance-catalogue.md) | Phase 2.1 persists one singleton Pair and a seeded Dance catalogue | Accepted |
| [0012](0012-routine-section-hierarchy.md) | RoutineSection is the mandatory Routine hierarchy level | Accepted |

Deferred physical-schema choices are tracked in [PHASE1_DECISIONS.md](../PHASE1_DECISIONS.md), not as accepted ADRs.
