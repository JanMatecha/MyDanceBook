# ADR 0002: FigureFrame defines entry; ExitState drives chaining

- Status: Accepted
- Date: 2026-08-17

## Context

FigureFrame is defined at FigureVariant start by Leader center and Leader forward direction. Persisting an ordinary independent Leader entry position/orientation in EntryState would duplicate the frame definition and allow a trivial contradiction. EntryState also previously risked duplicating `entryTimingConstraint`.

## Decision

EntryState and ExitState remain optional concise synchronization snapshots, but their geometry is intentionally asymmetric.

EntryState may contain:

- Follower position and orientation relative to Leader/FigureFrame;
- CouplePosition and Hold/Contact;
- per-member FootStates and weight distribution;
- Alignment and selected semantic/body boundary state.

Leader entry position is FigureFrame origin and Leader entry forward direction is FigureFrame `+Y` by definition. They are not independently editable EntryState values. EntryState does not own timing phase or an entry timing constraint; UI may display the FigureVariant's canonical `entryTimingConstraint` by reference.

ExitState may contain:

- Leader exit position and orientation in FigureFrame, which establish the next FigureFrame during Routine chaining;
- Follower exit position and orientation relative to Leader/FigureFrame;
- the same concise semantic and foot/body state categories as EntryState.

Entered-versus-derived provenance remains useful for genuinely derivable values, especially Follower boundary relations and Leader exit geometry. Entered values are not silently overwritten; disagreement produces review feedback.

## Consequences

The model cannot store a duplicate canonical Leader entry pose that contradicts FigureFrame. Routine chaining still has the explicit Leader exit data it needs. Timing constraint ownership is singular: `FigureVariant.entryTimingConstraint`.

Detailed Steps, state histories, trajectories, and complete technique are never copied into either snapshot.
