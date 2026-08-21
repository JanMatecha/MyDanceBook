# Project status

This is the current snapshot for a fresh development session. Replace obsolete
state; do not append history or session notes here.

## Implemented

- Phase 0 documentation/design and Phase 1.1 technical foundation.
- Phase 2.1 one-Pair onboarding/navigation slice: first-run Pair with Leader
  and Follower, profile switching including read-only Host mode, editable
  display names, persistent settings, and the ten seeded Standard/Latin Dance
  identities with separate Etudes navigation.
- Phase 2 Waltz Pilot – First Real Routine: generic persisted Figure and
  FigureVariant creation with an automatic first empty variant; Dance-scoped
  Routines; stable ordered RoutineFigures supporting placeholders, Figure or
  FigureVariant references and inline Figure creation and assignment. The Czech
  notebook UI supports quick Waltz routine capture and reloads
  the same saved data after restart; no real user figures or routines are
  seeded.
- Waltz Pilot usability pass: RoutineFigures render as compact ordered rows
  with one selected occurrence expanded for editing, while `+ Figura` creates
  and opens a new placeholder. The central Figure name can be renamed directly
  from the clearly scoped shared-definition area; the persisted central name is
  immediately shown by every referencing RoutineFigure.
- Figure names and aliases are progressive shared data: `nameCs` and `nameEn`
  are independently optional but require one non-blank value. A browser-local
  Czech/English display preference applies consistently with fallback to the
  available name; compact rows show the preferred name followed by a distinct
  secondary translation. It does not alter either stored field. FigureVariant also
  can both be absent when a Figure has one or more stable shared aliases. Alias-only quick capture, later official-name refinement, alias fallback display, and Dance-scoped alias filtering preserve the same Figure/Variant/RoutineFigure identities. FigureVariant also supports optional authored `timingNotation`; it is readable shorthand only,
  never parsed into exact timing. The generated sole variant is structurally
  real but implicit in normal use: new Figure assignments persist it directly,
  while legacy Figure-only occurrences resolve it for display and shared timing
  editing without changing SQLite on read. Compact RoutineFigure rows show
  timing, and clicking an open row title collapses its local context.
- An editable member can remove exactly one selected RoutineFigure occurrence
  with confirmation. Its Section remains valid when empty; its remaining
  occurrences are compacted to persisted positions 1..N, and the shared Figure
  and FigureVariant definitions remain intact.
- Mandatory RoutineSection hierarchy: every new Routine transactionally starts
  with `Část 1`; Sections can be created, renamed, and reordered; placeholders
  are added within a Section; occurrences reorder locally or move between
  Sections without losing identity or data; and global display numbers are
  derived by flattening the persisted hierarchy. Migration 0004 safely places
  existing flat occurrences under one initial Section while preserving their
  IDs, references, order, and timestamps.
- Safe SQLite persistence foundations, versioned migrations, backup primitive,
  Docker/runtime checks, and the React/Vite + Fastify application shell. The
  first post-Pair schema migration requires a verified pre-migration backup and
  has a non-empty Phase 2.1 Pair-database migration test.
- LAN development access: `npm run dev:lan` starts the same backend and a Vite
  frontend bound to `0.0.0.0` on strict port `5173`; the existing relative
  `/api` proxy path is unchanged.

## Not implemented yet

Figure archive/restore, Section delete/merge and drag-and-drop, multiple
user-created variants and central technique editing, Notes, Etude records,
structured technique, timing, geometry editors, and the later backup/restore
and collaboration capabilities are not yet available.

## Immediate objective

Continue entering and reopening real Waltz pair data with named RoutineSections,
the compact hierarchical routine overview, bilingual central Figure names, and
lightweight shared variant timing.
For trusted-LAN development, use the documented `npm run dev:lan` workflow.
Select the next narrow Phase 2 slice from observed notebook use, keeping the
workflow generic for every Dance and deferring advanced technique, timing,
geometry, and future roadmap work until it is needed.

There are no known unresolved blockers at this snapshot.
