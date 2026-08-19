# Project status

This is the current snapshot for a fresh development session. Replace obsolete
state; do not append history or session notes here.

## Implemented

- Phase 0 documentation/design and Phase 1.1 technical foundation.
- Phase 2.1 one-Pair onboarding/navigation slice: first-run Pair with Leader
  and Follower, profile switching including read-only Host mode, editable
  display names, persistent settings, and the ten seeded Standard/Latin Dance
  identities with separate Etudes navigation.
- Safe SQLite persistence foundations, versioned migrations, backup primitive,
  Docker/runtime checks, and the React/Vite + Fastify application shell.

## Not implemented yet

Central Figure/FigureVariant editing, Routines and RoutineFigures, Etude
records, Notes, structured technique, timing, geometry editors, and the later
backup/restore and collaboration capabilities are not yet available as the
complete textual notebook workflow.

## Immediate objective

Reach real usage as quickly as possible using Waltz as the first real-data
pilot. The next task is the narrow vertical **Waltz Pilot – First Real Routine**:

- keep the architecture generic for all dances;
- deliver only the minimum central Figure/FigureVariant and Routine/RoutineFigure
  workflow needed to enter a real Waltz routine;
- enter real Waltz data through the application, not as fake seeded product data;
- leave advanced technique, timing, geometry, and later phases out of scope until
  real usage shows the next priority.

There are no known unresolved blockers at this snapshot.
