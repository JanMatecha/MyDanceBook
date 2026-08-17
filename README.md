# MyDanceBook

MyDanceBook is a private dance notebook for one real competitive dance pair. It combines reusable knowledge about figures and their variants with concrete routines, training notes, timing, technique, and a two-dimensional floor view.

The product is guided by two priorities:

1. **One pair first.** The first release serves one Leader and one Follower well before it serves clubs, accounts, or multiple pairs.
2. **Create now, refine later.** A routine may start as unnamed placeholders, and every domain object may be enriched without changing its stable identity.

## Current phase

The repository currently contains an implementation-ready documentation baseline only. No application has been bootstrapped and no runtime or development dependencies have been selected or installed.

Implementation must not begin until this documentation has been reviewed. The intended direction after review is one full-stack TypeScript application with a React browser UI, a TypeScript API, SQLite, Docker deployment, and SVG visualization. Framework and ORM choices are deliberately still open.

## Core MVP at a glance

Core MVP lets one pair:

- configure the Leader and Follower and switch between their profiles or read-only Host presentation mode;
- create Standard and Latin routines, plus discipline-specific Etudes;
- enter routines rapidly with placeholders or figures created inline;
- maintain central reusable `Figure` and `FigureVariant` knowledge while keeping occurrence-specific context on `RoutineFigure`;
- add shared notes, Leader/Follower steps, technique, incomplete or exact timing, and simple movement data progressively;
- view a geometrically chainable routine on a rectangular SVG floor;
- use the browser UI on notebook, tablet, and phone;
- autosave real data to SQLite and create or restore transactionally consistent backups.

Core MVP intentionally excludes authentication, multiple pairs, clubs, Git-based dance-data versioning, official rule validation, offline synchronization, automatic floor adaptation, advanced trajectory drawing, and 3D.

## Documentation map

| Document | Authority |
| --- | --- |
| [Product](docs/PRODUCT.md) | Product vision, users, dance domain, and scope boundaries |
| [Core MVP](docs/CORE_MVP.md) | Release requirements and acceptance criteria |
| [UX](docs/UX.md) | Interaction model, responsive behavior, editing flows, and visual semantics |
| [Data model](docs/DATA_MODEL.md) | Authoritative conceptual entities, relationships, ownership, and persistence semantics |
| [Timing and geometry](docs/TIMING_AND_GEOMETRY.md) | Exact timing rules, coordinate frames, trajectories, and routine chaining |
| [Dance technique model](docs/DANCE_TECHNIQUE_MODEL.md) | Mapping of Standard and Latin technique into the common model |
| [Architecture](docs/ARCHITECTURE.md) | Runtime boundaries, persistence, deployment, migrations, backup, and concurrency |
| [Future roadmap](docs/FUTURE_ROADMAP.md) | Deferred increments that must not contaminate Core MVP |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Proposed vertical-slice order after documentation approval |
| [Agent instructions](AGENTS.md) | Rules for future AI-assisted work in this repository |

When documents overlap, the document named as the authority in this table owns the detailed decision; other documents should link to it rather than redefine it.
