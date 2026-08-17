# ADR 0003: Minimum safe SQLite backup exists in Phase 1

- Status: Accepted
- Date: 2026-08-17

## Context

The pair begins storing real data in Phase 2, while schema evolution starts earlier. Waiting until Phase 6 for the first safe backup capability would make pre-migration safety policy unenforceable and expose early real data.

## Decision

Phase 1 must implement a minimum technical SQLite backup capability before real-data reliance.

It must:

- use a supported transactionally consistent SQLite backup/snapshot mechanism, never a naive live-file copy;
- write a snapshot under the mounted backup data root;
- reopen the snapshot and verify basic integrity and compatible schema metadata;
- support invocation by migration/startup tooling before a meaningful data-changing migration;
- have automated success and failure-path tests using a non-empty database.

This may be an internal application service or maintenance command. Phase 1 does not require a polished backup list, user-facing manager, or Restore UX.

Phase 6 completes the product workflow: backup list/metadata, explicit Restore confirmation, a fresh safety backup before Restore, maintenance mode, recovery/failure handling, and polished Czech UI.

## Consequences

Phase 2 can accept real pair data without waiting for Phase 6 for its first recoverable snapshot. Migration design can rely on an already tested capability. The SQLite driver and backup mechanism must therefore be selected together before the first migration that can affect meaningful data.
