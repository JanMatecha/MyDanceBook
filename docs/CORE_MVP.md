# Core MVP release contract

This document is authoritative for the first usable release. “Core MVP” means the smallest coherent product that one real pair can use as its dance notebook—not a demo and not a foundation-only milestone.

## MUST HAVE

### Pair and profiles

- First run creates exactly one `Pair` after asking only for Leader display name and Follower display name.
- The application offers Leader, Follower, and Host in a persistent profile switcher.
- Leader and Follower can edit all pair data. Host is read-only in the UI.
- Profile selection records note authorship and presence context but is not authentication.
- No data is private and no member names are hardcoded.

### Dance navigation and settings

- Navigation groups the five Standard and five Latin dances and provides a separate Etudes entry under each discipline.
- A Dance may contain multiple Routines and pair-specific `DanceSettings`.
- The pair can show/hide and reorder a predefined catalogue of technical sections per discipline or dance.
- Shared catalogue objects that are already referenced are archived rather than destructively removed from existing uses.

### Figures and variants

- A Figure can be created with Dance plus a Czech name, English name, or both; at least one non-blank name is required.
- Figure identity includes Dance.
- Figure creation atomically creates its first FigureVariant and does not require the user to name that single variant manually.
- A FigureVariant is one reusable whole-couple execution with visibly and structurally separate couple, Leader, and Follower data.
- All technique, timing, movement, state, source, and geometry details are optional unless a requested calculation needs them.
- The user can duplicate a variant from a RoutineFigure. The operation clones the definition, creates an independent variant, switches that occurrence to it, and opens it for editing.
- Core MVP stores no variant genealogy solely for history.

### Routines and rapid entry

- A Routine can be created with only Dance and name; its first Section is created automatically as `Část 1`, while Floor, expected figure count, timing anchor, start placement, and notes remain optional.
- Each RoutineFigure has a stable ID, belongs to exactly one RoutineSection, and has one position within that Section.
- An occurrence can be a placeholder, reference a Figure only, or reference a FigureVariant.
- The `+ Figure` flow supports adding a placeholder, searching existing Figures, selecting a variant, or creating a missing Figure inline with a Czech name, English name, or both.
- Inline creation uses the Routine's Dance, creates the first variant, assigns it immediately, and keeps the user in the Routine.
- Reordering, inserting, and moving occurrences between Sections do not change stable IDs; displayed global numbers are derived by flattening the hierarchy.
- Each occurrence owns a manual Done flag and contextual data only. Core MVP has no generic RoutineFigure technical override.
- An optional expected total count supports manual progress independent of technical completeness.

### Sections and Etudes

- A Routine has one or more ordered Sections, and each RoutineFigure belongs to exactly one Section. Empty Sections are valid.
- Sections own their occurrence order; there is no second canonical flat Routine order. Section names are free user labels and are not inherently floor sides.
- Standard and Latin Etudes are separate cyclic constructions, not Dances.
- An Etude requires discipline and name, allows placeholders, uses the normal Figure/FigureVariant library, and rejects cross-discipline figure selection.
- A Standard Etude can combine Standard dances; a Latin Etude can combine Latin dances. Source Dance identity remains visible.

### Shared definition and local context

- Selecting an occurrence exposes the central Figure/FigureVariant directly in the Routine detail surface.
- The detail surface unmistakably separates “Shared definition – changes apply everywhere this variant is used” from “This occurrence in the routine.”
- Shared editing requires no extra unlock step.
- Central edits become visible in every referencing occurrence.
- Local area contains occurrence notes, Done, and routine/section context—never a hidden copy of central technique.

### Notes and lightweight sources

- One generic Note concept supports multiple notes on useful domain objects, including Dance, Figure, FigureVariant, Routine, RoutineSection, RoutineFigure, Step, and MovementEvent.
- Every Note has stable ID, text, author member, creation time, and update time.
- Notes are shared; the UI labels their attachment scope before and after creation.
- Technical items may retain lightweight source metadata such as trainer, book, organization, own note, or free textual reference.
- Core MVP does not store source documents or create official citations.

### Structured technique

- Leader and Follower Steps are first-class, independently ordered objects on one shared Figure timeline; their counts and timing may differ.
- Step supports optional common fields for moving/supporting foot, direction, placement, footwork, weight transfer, amount of turn, and extensible details. These fields are concise entered summaries/results of the numbered Step.
- Left and right FootState can separately describe load and contact; explicit and derived states retain their provenance.
- A TechnicalAction is bound to a Step and describes timed/internal process detail. It can target couple, member, or BodyPart with start, duration, type, parameters, and optional source. It may derive a candidate Step summary but never silently replaces an entered summary; disagreement can require review.
- Movement, MovementVariant, and MovementEvent support reusable and timed body movement not inherently bound to one Step.
- A missing Movement automatically gets a first variant after quick creation by name and optional description.
- BodyPart and GlossaryTerm have predefined, stable system vocabulary plus quick creation of incomplete custom entries.
- CouplePosition and Hold/Contact are separate extensible timed state layers.
- EntryState and ExitState are optional, incomplete boundary snapshots and do not duplicate the full figure definition. FigureFrame already defines Leader entry pose; EntryState stores no independent copy or timing constraint, while ExitState may store the Leader exit pose required for chaining.
- The model stores dance-semantic Rise & Fall, Sway, and Hip/Body Action independently from VerticalProfile, geometric inclination, and body-part geometry.
- Standard and Latin technical templates control emphasis and order, not domain validity.

### Timing

- A FigureVariant may retain optional authored `timingNotation` for readable shorthand. It is not parsed or used for exact duration or timing inference.

- Precise event timing uses exact rational counts of the beat unit defined by the FigureVariant's optional TimingScheme. `1/1` is one Scheme beat and `3/2` is one and one-half; floating point is not canonical.
- TimingScheme defines its musical beat unit and complete `barLength` in those beat units, plus reusable meter, notation, and optional nominal tempo conventions without permanent one-to-one Dance coupling.
- A FigureVariant may have no TimingScheme and remain fully usable, but it then has no canonical exact duration or exact event times. Assigning the first Pattern may explicitly select its Scheme; notation alone never infers it.
- TimingPattern always represents one complete bar and may initially contain only name and natural notation.
- Incomplete exact subdivision is marked incomplete/unvalidated but remains selectable.
- TimingPatternUse places full or clipped portions of complete-bar patterns on a Figure timeline, including partial first/final uses. Every use shares the FigureVariant's TimingScheme; incompatible assignment is refused or retained as review-required legacy/import data.
- Steps, TechnicalActions, MovementEvents, semantic states, and geometry can share that timeline.
- Optional `FigureVariant.entryTimingConstraint` is the only editable entry timing constraint and exists only with a selected Scheme. EntryState contains no duplicate; actual routine placement is distinct and derived.
- Routine's optional `musicalStartAnchor` plus ordered exact variant durations derives actual musical phase where possible; there is no duplicate manual routine timing sequence.
- Missing or inconsistent exact timing yields non-blocking “cannot yet verify” or “requires review” feedback.

### Geometry and floor visualization

- Floor creation requires name, positive width in metres, and positive length in metres. A Floor is an archivable concrete rectangle; a Routine can exist without one.
- Figure geometry is authored in Leader-based local `FigureFrame` and abstract Step Units (SU), not primarily normalized floor coordinates or metres.
- Optional DanceSettings can later map SU to metres without changing authored geometry.
- Trajectories can independently represent CoupleCenter, Leader, and Follower with simple straight, arc, and loop segments entered numerically or through forms.
- CoupleCenter is choreographic/visual, not a physical centre of mass; CoupleRotation is independent from its translation.
- EntryState may include optional Follower relation and semantic/foot boundary state; Leader entry pose is FigureFrame origin/`+Y` by definition. ExitState may include Leader exit placement/orientation and Follower exit relation.
- A Routine's optional start placement transforms the first Figure; Leader ExitState establishes the next FigureFrame. Missing geometry stops absolute derivation but not editing.
- An interactive 2D SVG shows the rectangular Floor, figure-start numbers, selected figure, known paths and orientations, and overflow.
- The SVG follows the arrowhead and chest-marker semantics defined in [UX.md](UX.md) and [TIMING_AND_GEOMETRY.md](TIMING_AND_GEOMETRY.md).
- VerticalProfile is a separate normalized relative curve with explicit transition semantics, never metre/SU height or automatic Rise & Fall.

### Safe everyday operation

- The UI is Czech and responsive in one browser application. Notebook is the full editor; tablet and phone support browsing, notes, Done, simple edits, and review.
- Core MVP requires a live connection to its backend.
- Changes autosave to SQLite.
- Two members can use the application simultaneously and see ephemeral informational presence warnings identified by session/profile/object and stale expiry; no object is hard-locked and presence is not authentication.
- Undo/Redo is limited to the current browser session. An inverse applies only if the relevant current value still equals the expected value written by the original command; otherwise Undo is refused/inactivated and the newer value is preserved.
- Internal checks are non-blocking and use at least `OK`, `REQUIRES REVIEW`, and `CANNOT YET VERIFY` semantics for timing, boundaries, chaining, derivation conflicts, and broken references.
- A minimum tested SQLite snapshot capability exists before Phase-2 real-data reliance and meaningful migrations. The completed Core release lets the pair create a transactionally consistent backup using a supported SQLite mechanism.
- Restore warns, requires confirmation, creates a safety backup of current state first, and then restores the selected backup.
- Schema migrations are versioned and preserve real data; ambiguous transformations are retained and flagged for review.

## SHOULD HAVE

These improve the first release but may be reduced if they threaten the complete must-have workflow:

- clear completeness indicators that point to missing structured data without blocking editing;
- basic search by aliases and translations where supplied;
- configurable Leader/Follower visualization colors;
- optional thin orientation markers at Step starts;
- simple connection summaries between adjacent RoutineFigures;
- keyboard-efficient quick entry on notebook;
- a rough technical coverage indicator only if it stays explicitly separate from Done and cannot be misread as dance knowledge percentage.

## NOT IN CORE MVP

- accounts, passwords, authentication, tenant isolation, multiple pairs, clubs, permissions, and secure guest access;
- complete WDSF/ČSTS figure data, RuleSet editor, official rule validation, or claims of official correctness;
- original source document storage, PDF-to-Markdown pipeline, stable citation anchors, and rule-version comparison;
- Git-based dance-data export/versioning, commits, tags, branches, history UI, semantic diff, import/merge, and selective packages;
- ownership, imported-object provenance, upstream update notifications, or three-way merge;
- generic RoutineFigure technical overrides or RoutineAdaptation;
- automatic adaptation/optimization to another Floor;
- hard locks, object revision engine, advanced conflict resolution, semantic merge, or persistent conflict-aware Undo;
- offline editing or mobile synchronization and a separate native mobile application;
- direct mouse trajectory drawing, Bézier/spline editor, irregular floors, obstacles, zones, or columns;
- 3D viewer, character animation, physical body dimensions, or automatic motion generation;
- a full custom section/field builder;
- Git as backup or a naive filesystem copy of a live SQLite database.

## Acceptance scenarios

All examples below use fictional user-entered content and assert product behavior, not official dance theory.

### 1. Configure the one Pair

**Given** a fresh database, **when** the user enters Leader and Follower display names, **then** one Pair with exactly those two members exists and the full application opens without account setup.

### 2. Capture an unknown routine

**Given** Waltz navigation, **when** the user creates “Training routine” with only its name, **then** the Routine is immediately usable with `Část 1` and no second creation dialog. **When** three placeholders are added to that Section, **then** it displays three stable ordered occurrences without demanding Floor, timing, or figures.

### 3. Create a Figure inline

**Given** the second placeholder in a Waltz Routine, **when** the user creates fictional example “Natural Turn” inline, **then** the Figure is assigned to Waltz, its first variant is created and selected atomically, the occurrence references it, and the user remains in the Routine.

### 4. Separate shared and local editing

**Given** a selected RoutineFigure, **when** the user edits the variant's shared notes and adds an occurrence note, **then** the shared note appears in every use of that variant while the local note appears only on that stable occurrence; both scopes are visually explicit.

### 5. Create a different execution

**Given** a RoutineFigure referencing a shared variant, **when** the user chooses “Create new variant from this variant,” **then** an independent copy is created, the current occurrence switches to it, other occurrences remain on the old variant, and no generic technical override or genealogy record is created.

### 6. Enter asymmetric dancer technique

**Given** an incomplete variant, **when** two Leader Steps and three Follower Steps with partially known FootStates and one Step-bound TechnicalAction are entered, **then** both sequences retain stable independent order and timing on the shared timeline without requiring matched counts.

### 7. Refine incomplete timing

**Given** a TimingPattern containing only “Example rhythm” and notation “S Q Q,” **when** it is selected for a variant without a Scheme, **then** the user explicitly accepts that Pattern's TimingScheme and the variant remains editable while exact calculations say they cannot yet evaluate. **When** exact rational subdivision is later supplied, **then** `1/1` means one Scheme beat, all values share that Scheme, and calculations use them without replacing stable references.

### 8. Add movement independent of steps

**Given** a selected variant, **when** the user quickly creates fictional Movement “Arm preparation,” **then** its first variant is created and a timed MovementEvent can target Follower.LeftArm across multiple Steps.

### 9. Visualize partial geometry

**Given** a Floor created with name and positive metre dimensions and a Routine with start placement, **when** the first two variants contain chainable Leader exit geometry but the third does not, **then** SVG renders the known portion, clearly marks where derivation stops, and keeps the third occurrence editable.

### 10. Use the application during training on phone

**Given** the backend is reachable, **when** a member opens the same Routine on a phone, **then** they can browse it, add a correctly scoped note, change Done, and perform simple edits without a separate mobile app.

### 11. Detect a non-blocking inconsistency

**Given** an explicitly entered ExitState and a conflicting derived boundary, **when** consistency checks run, **then** neither value is silently overwritten, the connection is marked `REQUIRES REVIEW`, and routine editing continues.

### 12. Back up and restore real data

**Given** autosaved SQLite data, **when** the user creates a backup, **then** the snapshot is transactionally consistent. **When** Restore is confirmed, **then** a safety backup of current state is created before restoration.

### 13. Refuse an unsafe session Undo

**Given** Jan changed one value from A to B and Zuzanna later changed it from B to C, **when** Jan invokes Undo, **then** the expected-current-value check fails, C remains unchanged, and Jan is told that the action can no longer be safely undone.

## Release gate

Core MVP is releasable only when all MUST HAVE flows work together on persistent real data, migrations and backup/restore have data-loss tests, key notebook and phone flows are tested, and incomplete data never causes unrelated work to fail. Partial implementation of advanced technique does not compensate for a missing fast routine notebook.
