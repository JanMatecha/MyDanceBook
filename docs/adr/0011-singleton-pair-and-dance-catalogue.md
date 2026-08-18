# ADR 0011: Phase 2.1 persists one singleton Pair and a seeded Dance catalogue

- Status: Accepted
- Date: 2026-08-18

## Context

The first product slice must create exactly one real pair, retain stable member identities, and expose the ten supported Dance identities before any Figure or Routine schema exists. Host is a presentation profile rather than a third member or security principal.

## Decision

Phase 2.1 persists:

- one `pairs` row enforced by a singleton key while retaining a UUIDv7 `TEXT` domain primary key;
- exactly one `pair_members` row per `LEADER` and `FOLLOWER` role, created with the Pair in one transaction;
- required editable display names and stable member UUIDv7 identities;
- ten seeded `dances` rows with stable UUIDv7 IDs, unique English codes, internal English names, discipline, and explicit order within the discipline.

The browser localizes Dance codes into Czech. Standard and Latin Etudes are navigation concepts only in this slice and are not inserted as Dances or Etude rows.

Host is never persisted as a PairMember. Active profile selection is disposable browser operational state stored locally; it is not authentication. Updating the two display names is one application command and one SQLite transaction.

Migration 0002 does not request a safety backup because it upgrades only the Phase 1 infrastructure schema, which contains no pair-created product data. Once onboarding can create real data, later meaningful data-changing migrations must use the existing verified pre-migration backup hook.

## Consequences

The database prevents a second Pair and duplicate roles while application reads verify that both required members are present. Dance identities are stable across installations and later Figure foreign keys. Optional Pair color and Floor settings can be added by controlled migrations in their owning slices without placeholder columns now.
