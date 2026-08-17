# ADR 0006: Floor dimensions are mandatory at creation

- Status: Accepted
- Date: 2026-08-17

## Context

A Floor is a concrete rectangular physical floor. Allowing a named but dimensionless Floor creates no current use case and pushes avoidable nullability into rendering, revision detection, and validation. Progressive routine capture does not require creating a Floor at all.

## Decision

Creating a Floor requires:

- name;
- positive `widthMeters`;
- positive `lengthMeters`.

A Routine still has optional `nominalFloorId`; it can be created and used indefinitely without a Floor. This is the “create now, refine later” path for unknown floor information.

Floor remains archivable, and a Routine that selects one retains its identity and enough revision information to detect materially changed dimensions.

## Consequences

Every persisted Floor is immediately meaningful for metre-scale rendering. There is no dimensionless Floor state or later completeness transition to migrate. Unknown floor dimensions are represented by no selected/created Floor, not by invalid physical data.
