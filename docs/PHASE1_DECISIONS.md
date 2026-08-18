# Phase 1 decisions

This document records the decisions that make the Phase 1.1 foundation executable. Product concepts that belong to later phases remain deliberately deferred; no placeholder product tables or screens are introduced in Phase 1.1.

## Accepted for Phase 1.1

### Runtime and repository layout

- Node.js 24 LTS, strict TypeScript and ECMAScript modules everywhere.
- npm with one root `package.json` and one lock file.
- One deployable application rather than a monorepo.
- Source modules are separated into `frontend`, `server`, `application`, `domain` and `persistence`.

### Frontend

- React with Vite and TypeScript.
- CSS Modules and a small set of CSS design tokens.
- Local component state, `useReducer` and small focused Context providers are sufficient for the early product.
- Native `fetch` with a small typed API client is the HTTP boundary.
- Tailwind, Bootstrap, Material UI, Redux, Zustand, Axios and TanStack Query are not part of Phase 1 or Phase 2 without a new decision.

### HTTP and application boundary

- Fastify provides a task-oriented JSON HTTP API and serves the production frontend build.
- Routes validate external values with Zod and call application commands or queries.
- The design uses explicit commands and queries, but is neither event sourcing nor a CQRS platform.
- Fastify, Zod and transport types must not enter the domain module.

### Persistence

- SQLite is the source of truth and `better-sqlite3` is the driver.
- Persistence uses explicit SQL repositories; no ORM or query builder is introduced.
- Connections enable foreign keys, WAL mode and a 5,000 ms busy timeout.
- Multi-statement changes use explicit transactions.
- UUIDv7 values stored as SQLite `TEXT` are the stable identifier convention. Display order remains a separate concern.

### Migrations

- Migrations are ordered, versioned SQL files executed by a small TypeScript runner.
- Applied version, name, checksum and timestamp are stored in the database.
- An applied migration is never silently changed or rerun.
- Each migration declares whether it requires a pre-migration backup. The first infrastructure migration does not.
- SQL is preferred. A controlled TypeScript transform may be added later only when a data migration cannot be expressed safely in SQL.
- Down migrations are not required. Recovery relies on verified backups and forward fixes.

### Data root and delivery

- `MYDANCEBOOK_DATA_DIR` is the configurable data root.
- Production must provide the variable explicitly; the container sets it to `/data`.
- The database, backups, attachments and repository directories are derived below that root.
- Attachments and repository directories are reserved only; they do not imply Phase 2 features.
- Production is one container and one Node.js process. Storage is initialized before traffic is accepted.
- The runtime image runs as a non-root user when the mounted data directory is writable for that user.

### Testing and tooling

- Vitest covers unit tests and integration tests against real temporary SQLite databases.
- Persistence, migration and backup behavior is not mocked.
- Browser end-to-end testing is deferred until there is a real user workflow.
- ESLint and Prettier are the initial linting and formatting tools.

### Backup safety

- A live database is backed up through SQLite's supported backup mechanism, never by copying its active files.
- A backup is written under a temporary name, reopened independently, checked with `integrity_check`, checked for migration metadata and only then published under its final unique name.
- Failed or invalid attempts are not reported as successful backups.
- The migration runner exposes an executable pre-migration safety hook for future risky migrations.

## Accepted domain clarifications

### FigureVariant duplication

Duplicating a `FigureVariant` copies its complete structured canonical owned definition and attached `SourceReference` values, but not `Note` values. The copy is independent and has no persistent genealogy link. A `RoutineFigure` that initiated the duplication may switch to the copy; every other occurrence remains unchanged.

### Etude timing context

`Etude.timingSchemeId`, when present, is contextual training timing. It does not override canonical timing on referenced figure variants. If the two contexts cannot be converted unambiguously, evaluation and verification must stop rather than guess. Detailed behavior remains a Phase 4 concern.

### Musical phase origin

Musical phase is elapsed time from the start of the bar. Count 1 is `0/1`, count 2 is `1/1`, count 3 is `2/1`, and the next bar starts at `barLength`; modulo `barLength` returns `0`. Count labels must never be stored as phase values.

## Deliberately deferred

The following questions are not required to bootstrap Phase 1.1 and remain open until their owning phase:

| Decision | Owning phase | Constraint already known |
| --- | --- | --- |
| Physical Note mapping | Phase 2 | Notes are first-class and survive safe target deletion as history. |
| Rational SQL representation | Phase 4 | The domain representation is exact reduced fractions in beat units. |
| Ordered collection key strategy | Phase 2 | Stable identity and display order are separate. |
| Extension payload encoding | Phase 2 or later | No placeholder JSON columns in the Phase 1.1 schema. |
| Occurrence table strategy | Phase 2 | `RoutineFigure` is required; further occurrence types need evidence. |
| `ARC` geometry representation | Phase 5 | Preserve semantic movement independently from geometry. |
| `LOOP` and repeated path semantics | Phase 5 | Do not improvise closure or repeated traversal rules. |
| Floor revision semantics | Phase 5 | A floor always has a name and dimensions; revisions must preserve historical meaning. |

## Revisit triggers

Revisit an accepted decision only when implementation evidence makes it unsafe or disproportionately costly, or when a later phase introduces requirements the decision cannot satisfy without distorting the domain model.
