# Instructions for AI agents

These instructions apply to the whole repository.

## Current repository phase

- Phase 0 documentation and design, the Phase 1.1 technical foundation, and the Phase 2.1 one-Pair onboarding/navigation slice are implemented. The next planned slice is Phase 2.2 central Figure library.
- `docs/IMPLEMENTATION_PLAN.md` defines the delivery order. Implement only the phase or slice the user explicitly requests; never speculatively implement later phases.
- Accepted Phase 1 technology and focused domain decisions live in `docs/adr/` and `docs/PHASE1_DECISIONS.md`. Do not reinterpret them unless implementation evidence reveals a real contradiction or safety problem.
- Physical and domain decisions marked as deferred must remain deferred until their owning phase.
- Before implementing a slice, inspect `AGENTS.md` and the relevant authoritative documents named in the documentation map.
- `docs/CORE_MVP.md` defines the release boundary. Preserve that boundary and do not pre-build systems from `docs/FUTURE_ROADMAP.md`.
- Keep documentation internally consistent and use cross-links instead of duplicating authoritative rules.

## Product priorities

1. Optimize for one real dance pair becoming productive quickly.
2. Follow **create now, refine later**: incomplete domain objects remain valid and usable unless a requested calculation mathematically needs missing information.
3. Prefer controlled future migrations over speculative multi-tenant, permission, versioning, rule, or collaboration infrastructure.
4. Keep `Pair` explicit, but do not design Core MVP as multi-pair SaaS.

## Non-negotiable domain rules

- A `Figure` belongs to a `Dance`; a `FigureVariant` is a reusable couple-level execution with distinct `coupleData`, `leaderData`, and `followerData` blocks.
- A `RoutineFigure` references central knowledge. Never copy a complete variant into a routine and never add a generic Core-MVP technical override to `RoutineFigure`.
- A materially different execution becomes a duplicated, independent `FigureVariant`; occurrence-only advice belongs in local `RoutineFigure` notes.
- `Etude` is a separate cyclic training construct, not a `Dance`, and keeps every referenced figure's source-dance identity.
- Leader and Follower steps are independently ordered and timed on one shared rational figure timeline. Their step counts need not match.
- `Step`, step-bound `TechnicalAction`, and independent timed `MovementEvent` are different concepts. A Step common field summarizes the numbered Step; a TechnicalAction describes timed/internal detail and never silently overwrites an entered summary.
- `TimingPattern` always describes a complete bar. A `TimingPatternUse` may expose only part of the first or final bar. Do not create artificial partial-bar patterns.
- Exact `RationalTime` counts beat units defined by the FigureVariant's optional `TimingScheme`: `1/1` is one Scheme beat and `3/2` is one and one-half. A variant without a Scheme has no canonical exact time, and incompatible Patterns cannot be assigned as exact timing.
- Figure timing is relative. Routine musical phase is derived from `musicalStartAnchor` and ordered variant durations where possible; do not maintain a duplicate manual routine timing sequence.
- `FigureVariant.entryTimingConstraint` is the single optional entry-timing constraint. EntryState may display it by reference but never stores an editable copy.
- `FigureFrame` is Leader-based: Leader entry pose is origin/`+Y` by definition and is not duplicated in EntryState. Routine geometry chains from Leader exit position and orientation in ExitState.
- A Floor requires name, positive width in metres, and positive length in metres at creation. Unknown floor information means a Routine has no selected Floor.
- `CoupleCenter` is a visual/choreographic center, not a physical center of mass. Translation and `CoupleRotation` are independent.
- Do not conflate dance-semantic theory with geometry: Rise & Fall is not `VerticalProfile`, Sway is not geometric inclination, Hip/Body Action is not pelvis/chest rotation, Alignment/Direction is not an absolute angle, and CouplePosition is not Hold/Contact.
- Trajectory arrowheads indicate forward/backward travel only. A chest triangle indicates chest direction only, never head or gaze direction.
- All pair data and notes are shared. Host is read-only presentation mode in the UI, not a security boundary.

Never invent official dance restrictions, values, classifications, or WDSF/ČSTS claims. Mark illustrative dance values as fictional. If real theory is unclear, preserve the ambiguity in structured extensible data or document the gap.

## Data and engineering rules

- User-facing UI text is Czech. Internal identifiers, code, API fields, schema names, and technical documentation are English.
- SQLite is the Core-MVP working source of truth. Preserve real user data through versioned migrations.
- A migration may convert unambiguous data; it must never silently discard or guess ambiguous data. Mark ambiguity for review.
- Use stable IDs and archive referenced shared objects instead of casually deleting them.
- Keep stable identities and relationships relational. Use structured extensible parameters for specialized, evolving technique; do not use one application-wide JSON blob or a table per imagined dance term.
- Keep entered canonical data distinguishable from derived data and from browser/session operational state.
- Tailscale is outside the application.
- A minimum tested, reopenable, transactionally consistent SQLite backup capability is required in Phase 1 before real-data reliance and meaningful migrations. Never copy a live database file naively; polished Restore UX remains Phase 6.
- Session Undo applies an inverse only when the relevant current value still equals the original command's expected post-value. Otherwise refuse/invalidate the Undo item and preserve the newer value.

## Implementation quality, once implementation is approved

- Deliver vertical slices in the order described in `docs/IMPLEMENTATION_PLAN.md`; the textual pair notebook must become usable before advanced timing, geometry, Git, rules, or 3D work.
- Add automated tests with implementation. Cover domain invariants, migrations, API behavior, and important responsive user flows in proportion to risk.
- Keep the accepted Phase 1 technology baseline; replace or expand it only when implementation evidence justifies an explicit new decision.
- Preserve logical frontend, API/domain, and persistence boundaries even if they deploy as one application.
- Treat autosave, concurrent edits, and restore workflows as data-loss risks and test them explicitly.

## Change discipline

Before finalizing a domain or architecture change, check it against `docs/DATA_MODEL.md`, `docs/TIMING_AND_GEOMETRY.md`, and `docs/DANCE_TECHNIQUE_MODEL.md`. If a genuine contradiction remains, document the contradiction, why it matters, and the smallest proposed resolution instead of silently choosing a new product rule.
