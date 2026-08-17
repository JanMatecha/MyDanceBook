# Phase 1 implementation decisions

This document lists technology and physical-schema choices that remain open after the accepted [ADRs](adr/README.md). It does not authorize bootstrap or implementation and does not change Core-MVP product scope.

“Preferred direction” below is a recommendation to evaluate, not an accepted technology decision. Each choice must be recorded before its deadline, with data-safety and migration consequences tested.

## Decision schedule

| Decision | Latest safe deadline |
| --- | --- |
| Runtime layout, SQLite driver, migration mechanism, data-access level, initial test runner | Before bootstrap/first migration |
| API style and runtime contract validation | Before first application endpoint |
| Note attachment and Routine/Etude physical occurrence strategy | Before their Phase-2 migrations |
| `orderKey` representation | Before the first ordered occurrence migration |
| Typed extension encoding | Before Phase-3 extension data |
| RationalTime SQL encoding/indexing | Before the first exact-timing migration in Phase 4 |
| ARC and LOOP parameterization | Before the first trajectory migration in Phase 5 |
| Floor revision fingerprint | Before the first Floor/Routine-floor migration in Phase 5 |

## 1. TypeScript/full-stack runtime layout

**Decision to make:** Choose how one deployable TypeScript application separates browser, server, domain, and persistence code.

**Constraints:** React frontend; TypeScript backend; one Docker deployable; logical boundaries from [ARCHITECTURE.md](ARCHITECTURE.md); no multi-service platform.

**Options:**

1. one Node server package serving built React assets plus API, with internal directories/modules;
2. small workspace with frontend/server/domain packages that still builds one container;
3. a full-stack meta-framework with server and browser conventions.

**Preferred direction:** Option 1 or a minimal form of option 2. Use a meta-framework only if its SQLite lifecycle, backup access, and migrations remain explicit.

**Deadline:** Before bootstrap and therefore before the first migration.

## 2. API style

**Decision to make:** Define the browser-to-server command/query contract.

**Constraints:** bounded field/section/task commands; atomic compound operations; exact rationals without float loss; stable error codes; no stale whole-FigureVariant autosave.

**Options:** task-oriented JSON HTTP/RPC; resource-oriented REST with command endpoints for compound work; framework-specific server actions.

**Preferred direction:** Task-oriented typed JSON HTTP commands and explicit queries. It maps directly to atomic domain operations and safe conditional Undo.

**Deadline:** May follow the first database migration, but must precede the first application endpoint.

## 3. Shared runtime validation and type contracts

**Decision to make:** Choose how untrusted runtime payloads and shared TypeScript types stay aligned.

**Constraints:** browser input must be validated at the server; exact rational pairs and discriminated technical/trajectory values need structural validation; domain types must not depend on HTTP.

**Options:** schema-first runtime validators that infer TypeScript types; OpenAPI/JSON-Schema generation; handwritten validators beside TypeScript interfaces.

**Preferred direction:** A schema-first runtime-validation boundary with generated/inferred transport types, mapped into independent domain types. Avoid trusting compile-time types at runtime.

**Deadline:** Before the first application endpoint; library choice may wait until runtime layout is selected.

## 4. SQLite driver

**Decision to make:** Select the Node-compatible SQLite driver and its production/runtime characteristics.

**Constraints:** foreign keys, transactions, prepared statements, exact integer round-trip, one container, supported consistent backup API/mechanism, and reliable reopen/integrity tests.

**Options:** synchronous native driver; asynchronous native binding; a lower-level binding wrapped by repositories. Pure browser/WASM SQLite is not a fit for the server source of truth.

**Preferred direction:** A mature native server driver with explicit transaction control and proven access to SQLite's supported backup facilities. Backup capability is a selection gate, not an afterthought.

**Deadline:** Before the first migration.

## 5. Migration mechanism

**Decision to make:** Choose how ordered, tested forward migrations and `schemaVersion` are executed.

**Constraints:** non-empty fixture tests; pre-migration backup; explicit SQL visibility; preserve ambiguous data; no assumption that down migrations are safer.

**Options:** versioned SQL files with a small TypeScript runner; query-builder migrations; a dedicated migration tool compatible with the selected driver.

**Preferred direction:** Versioned explicit SQL plus a small transactional runner unless a chosen tool makes generated SQL equally reviewable. Data migrations may use narrowly scoped TypeScript with retained originals and review flags.

**Deadline:** Before the first migration.

## 6. ORM, query builder, or raw SQL

**Decision to make:** Select the persistence access level behind application repositories.

**Constraints:** relational integrity, transparent migrations, typed queries where useful, small SQLite deployment, hybrid common/extension model, no framework leakage into domain types.

**Options:** explicit raw SQL repositories; thin typed query builder; full ORM.

**Preferred direction:** Thin typed query builder or explicit SQL behind repositories, with explicit SQL migrations. A full ORM needs a concrete advantage and must not hide constraints or backup/migration behavior.

**Deadline:** Before the first migration that application repositories access.

## 7. Test framework

**Decision to make:** Select unit/integration/component/browser test tools and fixture conventions.

**Constraints:** TypeScript domain tests, temporary real SQLite databases, migration matrices, React component behavior, responsive browser flows, backup failure paths.

**Options:** Node's built-in test runner plus browser-specific tools; a TypeScript-native runner such as Vitest; Jest plus a separate E2E runner.

**Preferred direction:** A fast TypeScript-native unit/integration runner with isolated temporary SQLite fixtures, plus a separate real-browser E2E tool when UI slices begin.

**Deadline:** Unit/integration choice before the first migration; E2E tool may wait until Phase 2 UI work.

## 8. Physical Note attachment mapping

**Decision to make:** Enforce exactly one valid target for each generic Note in SQLite.

**Constraints:** one Note concept, many target entity types, stable target IDs, real foreign-key integrity, easy addition of supported targets, no orphan Notes.

**Options:** target-specific attachment tables; nullable target foreign-key columns with a one-target CHECK; polymorphic `targetType/targetId` validated by services/triggers.

**Preferred direction:** Target-specific attachment tables and a unified query view/service. This is repetitive but keeps real foreign keys and avoids weak polymorphic references. Verify the exactly-one invariant transactionally.

**Deadline:** May wait until immediately before the first Note migration in Phase 2.

## 9. RationalTime SQL encoding and indexing

**Decision to make:** Persist normalized numerator/denominator values and query them safely.

**Constraints:** semantics are fixed by [ADR 0001](adr/0001-canonical-rational-time.md); no floating point; positive denominator; normalization; exact equality/order; values inherit one FigureVariant TimingScheme.

**Options:** two INTEGER columns per rational field; a referenced RationalTime value table; normalized textual fractions.

**Preferred direction:** Paired INTEGER numerator/denominator columns with CHECK constraints and normalization in domain/persistence code. Add indexes only for demonstrated range/order queries; cross-multiplication must consider SQLite integer overflow bounds.

**Deadline:** May wait until before the first exact-timing migration in Phase 4, but the transport/domain representation should be agreed in Phase 1.

## 10. `orderKey` representation

**Decision to make:** Store stable total order while item IDs remain unchanged.

**Constraints:** insert/reorder transactions; one pair and modest routine sizes; contiguous RoutineSection invariant; deterministic queries; no order encoded in IDs.

**Options:** contiguous integers with transactional renumbering; sparse integers; lexicographic/fractional rank strings.

**Preferred direction:** Contiguous or safely sparse integers with transactional renumbering. This is simpler and sufficient for one-pair data; fractional rank complexity is not justified without large-list evidence.

**Deadline:** Before the first ordered RoutineFigure/EtudeFigure migration in Phase 2.

## 11. Typed extension storage encoding/versioning

**Decision to make:** Persist sparse evolving technique without creating an application-wide blob or untyped EAV store.

**Constraints:** small owner scope; namespace; schema version; typed values/units/references; migrations can promote stable properties; common searchable data remains relational.

**Options:** versioned JSON object on each eligible owner; typed extension rows per value; an extension record per owner/namespace containing a small JSON value.

**Preferred direction:** One small versioned extension record per owner and namespace, with validated JSON content and explicit owner relation. Do not share one blob across the FigureVariant. Promote commonly queried fields through migrations.

**Deadline:** May wait until before the first Phase-3 extension data.

## 12. RoutineFigure versus EtudeFigure physical strategy

**Decision to make:** Use separate tables or one shared occurrence table while preserving different container rules.

**Constraints:** RoutineFigure has Done and optional Section; EtudeFigure is discipline-constrained and cyclic-container-specific; both allow placeholders/references; neither has technical overrides.

**Options:** separate tables with shared application abstractions; one occurrence table with exactly-one-container constraints; base occurrence table plus subtype tables.

**Preferred direction:** Separate tables and shared domain/application helpers. The small duplication preserves foreign keys and avoids nullable cross-container constraints.

**Deadline:** Before Phase-2 occurrence migrations, not before the initial Pair/schema migration.

## 13. Trajectory ARC parameterization

**Decision to make:** Define one canonical, non-redundant local-frame representation of an arc.

**Constraints:** FigureFrame/SU; signed direction; stable endpoints; optional rational time anchors; form-based entry; continuity checks; no spline editor.

**Options:** start point + centre + signed sweep; start/end + radius + side/direction; centre + radius + start angle + signed sweep.

**Preferred direction:** Start point, centre point, and signed sweep, with end derived and validated. It expresses traversal direction without storing conflicting endpoint/radius copies.

**Deadline:** May wait until before the Phase-5 trajectory migration.

## 14. Trajectory LOOP parameterization

**Decision to make:** Define what the simple Core `LOOP` segment means and how it closes.

**Constraints:** FigureFrame/SU; numeric/form entry; explicit traversal; stable entry/exit; no Bézier/spline semantics; must not be an arbitrary unvalidated parameter blob.

**Options:** full circular loop using ARC-compatible centre/radius/sweep; elliptical loop with centre/radii/rotation/start parameter; a validated composite of simpler STRAIGHT/ARC segments.

**Preferred direction:** Begin with a full circular loop represented by ARC-compatible parameters and an explicit full signed sweep. Choose ellipse/composite support only if real routines demonstrate the need before schema finalization.

**Deadline:** May wait until before the Phase-5 trajectory migration.

## 15. Floor revision fingerprint

**Decision to make:** Record enough reference information on a Routine to detect that its selected Floor's physical dimensions changed after placement was reviewed.

**Constraints:** Floor always has concrete positive metre dimensions; Routine Floor selection is optional; changing a central Floor must not silently imply that existing visualization remains reviewed; do not copy a new independent Floor into Routine.

**Options:** monotonically increasing Floor revision stored with the Routine selection; selected Floor `updatedAt`; deterministic hash of geometry-relevant Floor fields.

**Preferred direction:** An explicit integer Floor revision incremented only for geometry-relevant changes, with the selected revision stored on Routine. It is clearer than timestamp semantics and simpler to inspect than a hash.

**Deadline:** May wait until before the Phase-5 Floor/Routine-floor migration.

## Phase 1 decision gate

Before bootstrap, accept decisions 1 and 4–7 and record their rationale. Before the first endpoint, also accept 2–3. Later-deadline physical choices must remain explicitly unresolved—no placeholder columns or speculative tables should be created for them in the initial migration.
