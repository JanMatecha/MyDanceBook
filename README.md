# MyDanceBook

MyDanceBook is a private dance notebook for one real competitive dance pair. It combines reusable knowledge about figures and their variants with concrete routines, training notes, timing, technique, and a two-dimensional floor view.

The product is guided by two priorities:

1. **One pair first.** The first release serves one Leader and one Follower well before it serves clubs, accounts, or multiple pairs.
2. **Create now, refine later.** A routine may start as unnamed placeholders, and every domain object may be enriched without changing its stable identity.

## Current phase

Phase 0 domain and architecture refinement is complete. Phase 1.1 now provides the executable technical foundation: a minimal Czech React page, a Fastify health API, explicit SQLite initialization and migrations, verified SQLite backup infrastructure, automated tests, and a production Docker definition.

This is intentionally not the Phase 2 notebook. Pair onboarding, dance libraries, Figures, Routines, Etudes, Notes, timing and geometry editors are not implemented and no placeholder tables or screens claim otherwise.

The accepted implementation baseline is Node.js 24 LTS, strict TypeScript/ESM, React and Vite, Fastify, Zod at transport boundaries, and explicit SQLite through `better-sqlite3`. See [Phase 1 decisions](docs/PHASE1_DECISIONS.md) and [ADR 0010](docs/adr/0010-phase1-technical-baseline.md).

## Local development

Prerequisites:

- Node.js 24 LTS;
- npm 11 or a compatible npm release supplied with Node.js 24.

Install and run the development frontend and API:

```powershell
npm install
npm run dev
```

The Vite UI is available at `http://localhost:5173` and proxies `/api` to Fastify at `http://localhost:3000`. Development defaults to `.data/development` under the repository. To select another local data root:

```powershell
$env:MYDANCEBOOK_DATA_DIR = 'C:\persistent\MyDanceBook'
npm run dev
```

Useful checks:

```powershell
npm run typecheck
npm run lint
npm test
npm run format:check
npm run build
```

To exercise the production build locally, provide an explicit persistent directory. Production startup deliberately fails instead of falling back to the working directory:

```powershell
npm run build
$env:MYDANCEBOOK_DATA_DIR = 'C:\persistent\MyDanceBook'
npm start
```

The production application is then available at `http://localhost:3000`; readiness is reported by `GET /api/health`.

## Persistent data and safety

`MYDANCEBOOK_DATA_DIR` is the only data root. Startup creates or validates these children:

```text
database/     SQLite source of truth
backups/      verified SQLite snapshots
attachments/  reserved for a later phase
repository/   reserved for a later phase
```

SQLite connections enable foreign keys, WAL mode and a 5,000 ms busy timeout. Versioned SQL migrations are checksummed and tracked in `schema_migrations`. A migration marked as risky must invoke the backup hook first. Backups use SQLite's supported online backup operation, are reopened independently, checked for integrity and migration metadata, and receive their final filename only after verification. Phase 1.1 has no Restore UI.

## Docker

Build and run one application container with a persistent host directory mounted at `/data`:

```powershell
docker build -t mydancebook .
docker run --name mydancebook --publish 3000:3000 --mount type=bind,source=C:\persistent\MyDanceBook,target=/data mydancebook
```

The image runs as the Node image's non-root `node` user (UID 1000). On Linux, the mounted directory must therefore be writable by UID 1000. The container initializes storage and migrations before accepting traffic and includes a healthcheck against `/api/health`. Runtime user data is never baked into the image.

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

| Document                                               | Authority                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [Product](docs/PRODUCT.md)                             | Product vision, users, dance domain, and scope boundaries                              |
| [Core MVP](docs/CORE_MVP.md)                           | Release requirements and acceptance criteria                                           |
| [UX](docs/UX.md)                                       | Interaction model, responsive behavior, editing flows, and visual semantics            |
| [Data model](docs/DATA_MODEL.md)                       | Authoritative conceptual entities, relationships, ownership, and persistence semantics |
| [Timing and geometry](docs/TIMING_AND_GEOMETRY.md)     | Exact timing rules, coordinate frames, trajectories, and routine chaining              |
| [Dance technique model](docs/DANCE_TECHNIQUE_MODEL.md) | Mapping of Standard and Latin technique into the common model                          |
| [Architecture](docs/ARCHITECTURE.md)                   | Runtime boundaries, persistence, deployment, migrations, backup, and concurrency       |
| [Architecture decisions](docs/adr/README.md)           | Accepted focused decisions that constrain persisted data and Core safety               |
| [Phase 1 decisions](docs/PHASE1_DECISIONS.md)          | Accepted Phase 1 baseline and deliberately deferred physical-schema choices            |
| [Future roadmap](docs/FUTURE_ROADMAP.md)               | Deferred increments that must not contaminate Core MVP                                 |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md)     | Vertical-slice delivery order and phase gates                                          |
| [Agent instructions](AGENTS.md)                        | Rules for future AI-assisted work in this repository                                   |

When documents overlap, the document named as the authority in this table owns the detailed decision; other documents should link to it rather than redefine it.
