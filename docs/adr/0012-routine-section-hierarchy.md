# ADR 0012: RoutineSection is the mandatory Routine hierarchy level

- Status: Accepted
- Date: 2026-08-19

## Context

The previous model made `RoutineSection` optional. A Routine owned one canonical
flat global order of `RoutineFigure` occurrences, while an optional Section was
a contiguous grouping over that order. A `RoutineFigure` could therefore have
no Section.

Real notebook use needs named structural parts to be present from the first
entry, and maintaining an independent global occurrence order alongside a
Section order would create two competing canonical sequences.

## Decision

- Every Routine has one or more ordered RoutineSections.
- Every RoutineFigure belongs to exactly one RoutineSection.
- A RoutineSection belongs to exactly one Routine and has a stable ID, a free
  user-entered name, and an order within that Routine.
- RoutineFigure order is canonical only within its owning Section. There is no
  parallel canonical global RoutineFigure order.
- The displayed global Figure number is derived by flattening ordered Sections
  and each Section's ordered RoutineFigures.
- Moving a RoutineFigure between Sections preserves the RoutineFigure identity
  and all occurrence-owned data. The first implementation appends it to the
  target Section.
- Creating a Routine transactionally creates its first Section with the Czech
  user-visible name `Část 1`. Routine creation still asks only for Dance and
  name, preserving create-now-refine-later without a second dialog.
- Empty Sections are valid.
- Section names have no inherent floor-side, corner, or other dance semantics.
  Labels such as “První dlouhá strana” are user-authored organization only.

## Consequences

The canonical API shape is `Routine.sections[].routineFigures[]`. Persistence
stores Section order per Routine and occurrence order per Section. Existing
flat migration-0003 data is placed under exactly one generated `Část 1`
Section per Routine while preserving occurrence IDs, order, references, Done,
and timestamps.

Section and occurrence reorder commands keep stable IDs. Cross-Section movement
changes only the owning Section and local position. Global display numbers may
change after Section reorder, local reorder, or cross-Section movement because
they are derived rather than persisted.
