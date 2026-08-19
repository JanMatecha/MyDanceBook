# Instructions for AI agents

These instructions apply to the whole repository. Keep this file as a compact
router and safety boundary; detailed domain decisions belong in the documents
linked below.

## Start here

- Read [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) at the start of every task.
- Read only the authoritative documents relevant to the requested task. Do not
  scan or duplicate the whole documentation set.
- Follow [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md), but implement
  only the explicitly requested slice. Do not build future-phase infrastructure.
- Prefer one real pair becoming productive quickly. Use **create now, refine
  later**: incomplete objects remain valid unless a requested calculation needs
  missing information.
- Keep `Pair` explicit, but do not turn Core MVP into multi-pair SaaS or add
  speculative authentication, tenancy, permissions, or collaboration systems.

## Authority map

- Product and scope: [PRODUCT.md](docs/PRODUCT.md), [CORE_MVP.md](docs/CORE_MVP.md)
- Conceptual domain and persistence: [DATA_MODEL.md](docs/DATA_MODEL.md),
  [ADR log](docs/adr/README.md), and the relevant ADR
- Technique: [DANCE_TECHNIQUE_MODEL.md](docs/DANCE_TECHNIQUE_MODEL.md)
- Timing and geometry: [TIMING_AND_GEOMETRY.md](docs/TIMING_AND_GEOMETRY.md)
- Runtime, persistence, deployment: [ARCHITECTURE.md](docs/ARCHITECTURE.md),
  [PHASE1_DECISIONS.md](docs/PHASE1_DECISIONS.md)
- Delivery order: [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- Current state: [PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

When documents overlap, the named authority owns the detailed rule. If a real
contradiction appears, document it and propose the smallest safe resolution.

## Non-negotiable guardrails

- A `Figure` belongs to a `Dance`; a reusable `FigureVariant` has distinct
  couple, leader, and follower data. `RoutineFigure` references central
  knowledge: never copy a complete variant into it or add a generic technical
  override. A materially different execution is an independent variant;
  occurrence-only advice belongs in local notes.
- `Etude` is a separate cyclic construct, not a `Dance`, and retains each
  referenced figure's source-dance identity.
- Keep pair data shared. Host is read-only presentation mode, never an
  authentication boundary. Do not invent official dance restrictions or values;
  mark illustrative values as fictional and preserve unclear theory as
  structured ambiguity.
- UI text is Czech; identifiers, API fields, schemas, and technical docs are
  English. Keep frontend, application/domain, persistence, and infrastructure
  boundaries even in one deployable application.
- SQLite is the Core-MVP source of truth. Preserve stable IDs and real data;
  use versioned migrations, convert only unambiguous values, and never silently
  discard or guess ambiguous data; retain and mark ambiguity for review.
  Archive referenced shared objects instead of casually deleting them. Never
  copy a live database file as a backup.
- Add appropriate automated tests with implementation. Update
  `PROJECT_STATUS.md` when implemented state materially changes; it is a
  replaceable snapshot, not a changelog.

Detailed timing, geometry, technique, backup, concurrency, and other domain
invariants remain in their authoritative documents above.
