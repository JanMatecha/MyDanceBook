# Technical architecture

This document is authoritative for the Core-MVP runtime, logical boundaries, persistence, deployment, backup, autosave, and simultaneous-use behavior. The Phase 1 technical baseline is accepted in [ADR 0010](adr/0010-phase1-technical-baseline.md); later product capabilities remain staged in the implementation plan.

## Architectural drivers

- One pair should reach a usable textual dance notebook quickly.
- Real data starts in Core MVP, so migrations, transactions, backup, and restore are product features rather than cleanup work.
- Incomplete domain objects are normal and cannot be forced through rigid all-fields validation.
- Central FigureVariant edits must propagate by reference without copied routine data.
- Notebook, tablet, and phone use one responsive browser UI with an active backend connection.
- Future systems need clean boundaries, not premature persistence models.

## Approved technical direction

- one full-stack TypeScript codebase and deployable application;
- Node.js 24 LTS, strict TypeScript, ESM and one npm package;
- React + Vite browser frontend using CSS Modules;
- Fastify task-oriented JSON API with Zod transport validation;
- SQLite through `better-sqlite3`, explicit SQL and versioned SQL migrations;
- one Docker container for application deployment;
- a mounted `/data` root selected through `MYDANCEBOOK_DATA_DIR`;
- browser-native interactive SVG for the two-dimensional floor view.

“One application” means one deliverable and operational unit, not an undifferentiated codebase. Frontend, application/domain services, persistence, and infrastructure remain logically separated.

## Accepted focused decisions

The [ADR log](adr/README.md) fixes the decisions that would otherwise make early persisted data ambiguous or unsafe, including the Phase 1 technical baseline, variant duplication, Etude timing context, musical phase origin, TimingScheme beat units, boundary-state geometry, backup, safe conditional session Undo, Step summary versus TechnicalAction detail, and mandatory Floor dimensions. Deliberately deferred physical choices remain listed in [PHASE1_DECISIONS.md](PHASE1_DECISIONS.md).

## System context

```mermaid
flowchart LR
    B1["Notebook browser"] --> APP["MyDanceBook container"]
    B2["Tablet / phone browser"] --> APP
    APP --> API["TypeScript API and domain services"]
    API --> DB["SQLite in /data/database"]
    API --> BK["SQLite backups in /data/backups"]
    APP --> SVG["React + SVG UI"]
    NET["LAN / optional Tailscale network"] -. "outside app" .-> APP
```

Tailscale supplies optional network reachability only. MyDanceBook does not call Tailscale APIs, authenticate through Tailscale, or configure it.

## Logical application boundaries

```mermaid
flowchart TB
    UI["Presentation\nReact, Czech UI, responsive layouts, SVG"] --> AC["Application commands and queries"]
    AC --> DM["Domain model and invariants"]
    AC --> PS["Persistence ports"]
    PS --> SQL["SQLite adapters and migrations"]
    AC --> OP["Operational services\npresence, backup/restore"]
    UI --> SS["Browser session state\nselection, panels, Undo/Redo"]
```

### Presentation

Owns Czech labels, responsive navigation, forms, scope visualization, incomplete/review state, SVG rendering, profile selection, and browser-session Undo history. It may use derived view models but cannot become the source of truth for persisted dance data.

### Application commands and queries

Expose task-level operations rather than raw table mutation. Important commands include:

- initialize Pair;
- create Figure with first variant;
- create Movement with first variant;
- create/reorder/link RoutineFigure;
- inline-create Figure and assign it;
- duplicate variant and switch occurrence;
- autosave a bounded edit;
- archive/restore a shared object;
- create backup and guarded restore.

Commands enforce cross-entity invariants transactionally. Queries produce views with canonical data, derived values, incompleteness, and consistency status clearly separated.

Fastify exposes task-oriented JSON HTTP endpoints. The protocol must support typed contracts, stable error codes, rational numerator/denominator values with explicit TimingScheme context and no float loss, atomic task-level commands, and conditional expected-value inverses for safe Undo.

### Domain model

Owns invariants from [DATA_MODEL.md](DATA_MODEL.md), rational and frame semantics, archive rules, and non-blocking consistency checks. It must not depend on React, HTTP, Docker paths, or SQLite-specific row shapes.

### Persistence

Maps the relational core and typed extension records to SQLite, controls transactions and foreign keys, and runs versioned migrations. The browser never opens or modifies SQLite directly.

### Operational services

Presence, backup/restore coordination, health reporting, and maintenance state are application operations but not canonical dance entities. They must not leak future authentication or collaboration concepts into every domain record.

## Project structure direction

The implementation separates:

```text
application root
├── frontend/ or equivalent presentation boundary
├── server/ or equivalent API/runtime boundary
├── domain/ shared domain types and pure rules
├── persistence/ SQLite mappings and migrations
└── tests/ organized around the same boundaries
```

These are source directories in one npm package, preserving the import boundaries while producing one deployable product.

## SQLite strategy

SQLite is the live Core-MVP source of truth. Configure foreign-key enforcement and use transactions for aggregate changes. Stable relational structure covers identities, relationships, ordering, common searchable fields, timing uses, and Notes. Small typed extension values handle sparse evolving technique as described in [DATA_MODEL.md](DATA_MODEL.md).

Avoid:

- one JSON document for an entire FigureVariant or database;
- a table/column for every imaginable dance term;
- speculative pair/tenant/permission columns everywhere;
- duplicated canonical routine timing or transformed geometry;
- storage of operational UI state as dance data.

### Schema version and migrations

Maintain an explicit ordered migration history and a database schema-version record. Every application startup verifies that the database is compatible and runs only approved forward migrations under a transaction or the safest SQLite-supported migration sequence.

Migration policy:

1. invoke the Phase-1 minimum backup capability and verify a pre-migration safety snapshot before changes with meaningful data risk;
2. preserve stable IDs and references;
3. transform unambiguous values deterministically;
4. retain ambiguous original information and mark it for review;
5. never silently discard or guess real dance data;
6. verify constraints and expected row/object counts before completion;
7. test migration from realistic previous fixtures, not only an empty database.

Rollback-by-down-migration is not assumed to be safer. Recovery can use the verified safety backup when a forward migration cannot complete.

The SQLite driver and minimum backup mechanism are selected together before data-changing migrations. Phase 1 proves that a non-empty consistent snapshot can be created, reopened, and integrity-checked; migration policy must not depend on the later Phase-6 backup-manager UI.

### Typed extension storage

Before an owning slice writes extension data, it must define:

- owner/target identity;
- namespace and parameter key;
- schema version;
- supported scalar/reference/structured value types;
- units or vocabulary references where relevant;
- indexing and promotion rules.

Extension records remain small and locally owned. Promotion to common relational fields is a normal controlled migration.

## Autosave

Autosave sends bounded field/section/task commands, not full stale aggregate snapshots. Replacing a FigureVariant with a large client snapshot is never the normal save mechanism. Each command validates only what its operation needs and accepts incomplete surrounding objects.

The UI distinguishes:

- local edit pending;
- save in progress;
- persisted;
- connection/save failed;
- persisted but consistency review required.

Same-field simultaneous normal edits may use simple last-successful-write behavior in Core MVP; this is an accepted residual risk. Presence reduces accidental overlap, and conditional Undo prevents an obvious later value from being reverted, but neither is semantic merge or an optimistic-concurrency framework. Failed writes must remain visible and retryable; the UI cannot display “saved” before the backend transaction succeeds.

## Simultaneous use and presence

Leader and Follower can connect at the same time. A minimum ephemeral presence record contains `sessionId`, active member/profile, `objectType`, `objectId`, and `lastSeenAt`, refreshed by heartbeat/polling and removed after stale expiry. It supports an informational warning and never hard-locks an object.

Presence data:

- is not durable dance data;
- can be lost on process restart without harm;
- is advisory and may be stale briefly;
- does not establish identity or permission.

Advanced object revisions, optimistic concurrency, semantic conflict resolution, and merge are future work. Core MVP should log and surface persistence errors so data loss is diagnosable.

## Session Undo/Redo

Undo/Redo lives in each browser session as a stack of successful user commands and inverse intent. For a bounded change `A → B`, the item records target, A, and expected current value B. Undo issues an atomic conditional command that applies `B → A` only if the relevant current value still equals B. It is not a database time machine and does not survive restart.

If the current value is no longer B, the command changes nothing, the item is refused/inactivated, and the UI explains that it cannot be safely undone. Multi-field inverse commands require all relevant expected values to match and never partially undo an atomic action. The stack is cleared or conservatively limited when assumptions become unsafe, such as after Restore or large external refresh. This lightweight precondition is defined in [ADR 0004](adr/0004-safe-session-undo.md); persistent history, object revisions, and conflict-aware Undo remain future work.

## Backup and restore

Backups use a supported SQLite online backup mechanism/API to create a transactionally consistent snapshot. A raw filesystem copy of an active database is forbidden.

### Phase 1 minimum capability

Before Phase 2.1 began storing real pair data, Phase 1 established an internal service/maintenance command that creates a consistent snapshot, reopens it, and verifies integrity plus schema metadata. It is callable before meaningful migrations and tested with non-empty data and failure paths. It does not require a user-facing backup browser or Restore controls. See [ADR 0003](adr/0003-phase1-sqlite-backup.md).

The same safe primitive underlies the completed Core user-facing create-backup flow:

1. request backend backup operation;
2. use SQLite's supported snapshot/backup facility while normal consistency guarantees hold;
3. write to a temporary backup target under `/data/backups`;
4. verify the snapshot opens and passes basic integrity/schema checks;
5. atomically publish backup metadata/name;
6. report success only after verification.

### Phase 6 completed workflow

Phase 6 adds backup list/metadata and the guarded user-facing restore flow:

1. validate selected backup metadata and compatibility;
2. show warning and require explicit user confirmation;
3. enter short maintenance mode and reject new edits;
4. create and verify a safety backup of current state;
5. restore using a supported SQLite-safe process;
6. reopen and integrity-check the database;
7. run only compatible required migrations;
8. leave maintenance mode and force clients to reload canonical state.

On failure, retain or recover the pre-restore current state and present a clear error. Restore is serialized with migrations and other maintenance operations.

## Docker data layout

The container uses one stable mounted root:

```text
/data/
├── database/      # active SQLite database and SQLite-managed companion files
├── backups/       # verified database snapshots and metadata
├── attachments/   # reserved for later source/document capability
└── repository/    # reserved for later Git/export capability
```

Core MVP actively needs `database/` and `backups/`. Empty future directories may be created by deployment only when useful, but their presence must not imply implemented attachment or Git features.

The host/NAS supplies `/data` through a Docker volume or bind mount. Application UX does not browse arbitrary host filesystem paths from inside the container. Startup verifies writable directories and fails clearly rather than silently using ephemeral container storage.

## SVG and responsive frontend

SVG derives its rendered model from canonical SU geometry, optional scale, Routine placement, and Floor dimensions. It does not write transformed Floor-coordinate copies back to FigureVariant. Marker semantics are defined in [TIMING_AND_GEOMETRY.md](TIMING_AND_GEOMETRY.md).

React presentation uses one route/state model across notebook, tablet, and phone. Complex controls can reflow to full-screen mobile editors without creating a separate API or data model. Accessibility alternatives exist for drag, color, and SVG-only information.

## Trust and security boundary

Core MVP assumes deployment on a network controlled by the pair. There is no login. Leader/Follower/Host selection is a UI context and must never be advertised as authorization.

The backend must still follow ordinary safety basics: validate inputs, avoid arbitrary path access, constrain backup names/locations, protect against malformed requests, and avoid exposing SQLite internals. Real remote guest security requires future authentication/permissions and is explicitly not achieved by Host mode.

## Testing obligations by product slice

Vitest is the accepted unit and integration test framework. Later product slices must add the relevant coverage below; browser end-to-end tooling remains deferred until the first real user workflow requires it:

- pure domain tests for central-reference, ordering, discipline, rational-time, and state-provenance invariants;
- migration tests with non-empty fixtures and ambiguous data cases;
- persistence transaction/foreign-key tests;
- API contract tests for atomic compound commands;
- backup consistency, restore safety-backup, and failure-recovery tests;
- conditional Undo tests proving a changed expected value is never overwritten;
- autosave and simultaneous-use risk tests;
- responsive end-to-end tests for the notebook and key phone flows;
- deterministic SVG model tests plus focused visual/accessibility checks.

## Future system boundaries

Core code should expose narrow seams, not implement future subsystems:

- export/versioning reads stable domain snapshots through an application query later;
- sources/rules attach through SourceReference migration rather than polluting current technique records;
- authentication/multiple pairs can add principal/ownership roots through controlled migration;
- RoutineAdaptation becomes a separate derived/override aggregate rather than changing Core RoutineFigure;
- advanced geometry adds segment types/renderers without redefining SU/FigureFrame;
- 3D adds body models and transforms without making the 2D semantic layers obsolete.

## Deferred implementation decisions

[PHASE1_DECISIONS.md](PHASE1_DECISIONS.md) records the accepted Phase 1 technical baseline and the remaining physical mappings/encodings with their owning phases. Accepted choices remain in force unless implementation evidence exposes a contradiction or safety problem; deferred choices remain open until their owning phase.

Selection criteria for deferred choices remain data safety, migration transparency, type correctness, low operational complexity, and speed to the textual notebook—not future-platform feature count. Do not implement a deferred choice silently.
