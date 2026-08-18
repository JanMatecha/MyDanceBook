# ADR 0010: Phase 1 uses one strict TypeScript application with explicit SQLite

- Status: Accepted
- Date: 2026-08-17

## Context

Implementation cannot begin safely while the runtime, HTTP boundary, database driver, migration mechanism, test strategy and production data-root behavior remain recommendations. The first foundation should be small while already enforcing the boundaries needed before real data arrives.

## Decision

Phase 1 uses:

- Node.js 24 LTS, strict TypeScript, ESM and one npm package;
- React and Vite with CSS Modules for the browser;
- Fastify with task-oriented JSON routes and Zod at transport boundaries;
- native `fetch` and a small typed frontend client;
- `better-sqlite3`, explicit SQL repositories and explicit transactions;
- versioned SQL migrations with checksummed database history and an executable pre-migration backup hook;
- Vitest against real temporary SQLite databases, plus ESLint and Prettier;
- one production container and Node.js process, with `MYDANCEBOOK_DATA_DIR=/data` and startup initialization before listening.

The source remains one deployable application split into `frontend`, `server`, `application`, `domain` and `persistence`. No ORM, query builder, global frontend store, broad UI framework or second service is introduced.

## Consequences

The project has one operational unit and a narrow dependency surface. SQL and filesystem concerns stay outside domain/application logic, and routes do not contain persistence code. Future technology changes require evidence and an explicit decision because they affect migration and deployment safety.
