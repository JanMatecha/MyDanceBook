# Implementation plan after documentation review

This is a proposed delivery order, not authorization to implement. The next task must first review and approve the documentation baseline and resolve the focused Phase-1 decisions in [ARCHITECTURE.md](ARCHITECTURE.md).

The plan uses vertical slices: each phase leaves executable, tested behavior and migratable data. The textual pair notebook becomes genuinely usable before the richer technique, timing, and geometry editors.

## Phase 0 — documentation review and decision gate

Outcome: product owner and implementer agree on Core scope and open schema/tool decisions.

- walk through every acceptance scenario in [CORE_MVP.md](CORE_MVP.md);
- review the relational model, especially Note targets, Etude occurrences, rational encoding, order keys, and typed extensions;
- review Standard and Latin representability fixtures with the real pair;
- confirm Czech terminology strategy without inventing official theory;
- record focused ADRs for framework/runtime, API style, SQLite access/migrations, validation/types, and tests;
- define a sample real-data fixture and backup/migration test policy.

Exit gate: no unresolved contradiction, explicit approval to bootstrap, and chosen tools justified by the first notebook rather than future roadmap features.

## Phase 1 — project skeleton and database foundation

Outcome: one deployable TypeScript/React/SQLite application shell with safe persistence, but no placeholder dance-feature facades presented as complete.

Vertical slice:

1. establish the selected full-stack TypeScript build/dev/test layout;
2. implement backend health/startup and one minimal React browser shell;
3. establish domain/application/persistence import boundaries;
4. configure SQLite, foreign keys, transaction helper, and `schemaVersion` migrations;
5. define stable ID, timestamp, rational, order-key, archive, typed-extension, and generic-Note attachment storage conventions;
6. implement Docker build/runtime and verify mounted `/data/database` and `/data/backups` fail safely when unavailable;
7. create migration fixtures and automated empty/non-empty migration tests;
8. establish Czech UI localization and English internal naming conventions.

Do not build Git, rules, authentication, multi-pair, attachments, or 3D foundations.

Exit gate: a clean deployment persists a deliberately small schema fixture across restart, migrations preserve a non-empty fixture, and tests prove ephemeral container storage cannot be mistaken for mounted production data.

## Phase 2 — first usable pair notebook

Outcome: the pair can use MyDanceBook for real textual routines and training Notes.

### Slice 2.1: one Pair and navigation

- first-run transaction creates Pair, Leader, and Follower;
- profile switcher includes Host presentation mode;
- seed the ten Dance identities and render Standard/Latin/Etudes navigation;
- persist basic settings without authentication or tenancy.

### Slice 2.2: central figure library

- create/archive/restore Figure by Dance and name;
- atomically create its first FigureVariant;
- list/select/rename variants;
- enforce central references rather than copies.

### Slice 2.3: routines and quick capture

- create Routine with only Dance and name;
- add placeholder RoutineFigures with stable IDs;
- reorder and derive display numbers;
- search/select Figure and variant;
- create Figure inline and assign it without leaving Routine;
- add optional contiguous RoutineSections;
- add manual occurrence Done and expected total progress.

### Slice 2.4: shared/local editing and Notes

- implement the responsive three-region shell and mobile full-screen detail flow;
- show direct central FigureVariant editing beside occurrence context;
- implement generic multi-Note behavior with author and explicit scope;
- implement “duplicate variant and switch this occurrence” atomically;
- render Host as consistently read-only.

### Slice 2.5: Etudes

- create Standard/Latin Etude with name;
- ordered placeholders and FigureVariant references;
- enforce same-discipline source Dance;
- fixed cyclic semantics; defer optional TimingScheme selection until the timing model exists in Phase 4.

Phase-2 tests cover all central/local reference and quick-entry acceptance scenarios on notebook and phone widths. Use a real pair-created textual fixture before exit.

Exit gate: the pair can maintain real routines, placeholders, figures, variants, Notes, and Done on notebook and phone. This is the first usable product milestone.

## Phase 3 — structured technique

Outcome: the pair progressively records useful Standard and Latin technique without losing the Phase-2 notebook speed.

### Slice 3.1: Steps and feet

- independent ordered Leader/Follower Steps;
- moving/supporting foot, direction, placement, footwork, weight transfer, turn;
- separate left/right FootState with entered/derived provenance;
- compact discipline-aware Step editors.

### Slice 3.2: TechnicalActions and targeting

- Step-bound TechnicalAction;
- target couple/member/BodyPart;
- predefined extensible BodyPart hierarchy;
- structured parameters and lightweight SourceReference.

### Slice 3.3: movement library

- Movement creation with automatic first MovementVariant;
- MovementEvent on a variant timeline;
- quick body-part targeting and events spanning Steps;
- archive behavior and stable references.

### Slice 3.4: semantic states and vocabulary

- GlossaryTerm seed plus quick custom creation and alias search;
- CouplePosition and separate Hold/Contact timelines;
- EntryState/ExitState boundary snapshots;
- Rise & Fall, Sway, Hip/Body Action, Alignment/Direction, CBM/CBMP structured choices according to reviewed ADRs;
- predefined Standard/Latin section templates with show/hide/reorder.

Tests instantiate the fictional Standard and Latin fit fixtures from [DANCE_TECHNIQUE_MODEL.md](DANCE_TECHNIQUE_MODEL.md) plus sanitized real examples. They assert no matching dancer step counts and no semantic/geometric conflation.

Exit gate: both members can add incomplete structured technique to a real variant directly from its Routine context without using Notes for common fields.

## Phase 4 — rational timing

Outcome: natural dance notation can be captured early and refined into exact shared timing.

### Slice 4.1: timing vocabulary

- TimingScheme and complete-bar TimingPattern;
- natural notation first;
- explicit incomplete/exact-unvalidated/exact-validated states;
- exact rational storage and arithmetic tests.

### Slice 4.2: shared Figure timeline

- TimingPatternUse including partial first/final bar slices;
- exact start/duration for Steps, TechnicalActions, MovementEvents, and state changes;
- independent dancer sequences on one timeline;
- non-blocking consistency checks.

### Slice 4.3: Routine phase

- optional musicalStartAnchor;
- derived occurrence phases from ordered exact durations;
- entryTimingConstraint comparison;
- stop derivation cleanly at incomplete occurrence;
- no duplicate manual RoutineFigure phase fields.

Exit gate: the incomplete-then-refine acceptance scenario works without ID/reference changes, rational round-trip is exact, and mid-bar boundaries are represented by PatternUse slices.

## Phase 5 — geometry and SVG

Outcome: the pair can enter simple local geometry and understand the known portion of a Routine on a Floor.

### Slice 5.1: Floors and frame foundation

- rectangular Floor in metres, archive/default behavior, and revision warning;
- optional Routine start placement/orientation;
- FigureFrame/SU values and optional or assumed SU-to-metre scale;
- boundary geometry with provenance.

### Slice 5.2: trajectories and chaining

- independent CoupleCenter/Leader/Follower trajectories;
- numeric/form straight, arc, and loop segments;
- independent CoupleRotation;
- Leader Exit-driven chaining and explicit stop at missing geometry;
- Entry/Exit connection checks.

### Slice 5.3: SVG floor

- rectangular floor, start markers, paths, orientation markers, selection, and overflow;
- correct arrowhead versus chest/head semantics;
- accessible textual equivalents and responsive tablet/phone viewing;
- central geometry edits recompute downstream placement.

### Slice 5.4: VerticalProfile

- common or separate dancer curves;
- relative continuous values and transition types;
- explicit separation from Rise & Fall and metre/SU geometry.

Exit gate: partial geometry acceptance renders the known prefix and explains the derivation boundary without creating per-occurrence geometry copies.

## Phase 6 — Core usability and data-safety hardening

Outcome: all Core-MVP flows are reliable enough for sustained real use.

- complete responsive review across notebook, tablet, and phone;
- optimize training quick entry and keyboard/touch behavior;
- implement ephemeral presence and soft edit warning;
- implement browser-session Undo/Redo with conservative invalidation;
- harden autosave failure/retry communication;
- implement transactionally consistent backup creation;
- implement guarded restore with verified safety backup and maintenance mode;
- exercise multiple forward migrations against accumulated real-data copies;
- complete archive/reference and internal consistency behavior;
- performance, accessibility, operational logging, and recovery testing;
- verify every Core-MVP acceptance scenario end to end.

Exit gate: MUST HAVE requirements pass as one integrated system; backup/restore and migrations have failure-path tests; the pair validates a copy of its real data on all target form factors.

## Testing progression

Tests begin in Phase 1 and grow with each slice:

- domain invariants and exact arithmetic at the pure layer;
- persistence mappings, foreign keys, and transactions;
- migrations from every released schema fixture;
- task-level API contracts, especially compound creation/duplication/reorder commands;
- responsive end-to-end flows for critical notebook and phone scenarios;
- SVG render-model semantics and accessibility;
- backup integrity, restore rollback/safety, and autosave failures.

No phase defers all testing to Phase 6. Phase 6 expands risk/failure coverage and performs integrated hardening.

## Post-Core increments

Only after the Phase-6 release gate, select a separately scoped increment from [FUTURE_ROADMAP.md](FUTURE_ROADMAP.md):

- deterministic export and Git versioning;
- advanced collaboration and persistent Undo;
- source documents, RuleSets, and official validation;
- RoutineAdaptation and floor optimization;
- sharing, clubs, multiple pairs, authentication, and provenance;
- advanced drawing, splines, 3D, BodyModel, and animation.

Do not pre-build these systems during Core phases unless an approved Core requirement truly depends on a small neutral boundary. Document and review any such dependency before implementation.
