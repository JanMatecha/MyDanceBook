# ADR 0007: FigureVariant duplication creates an independent canonical copy

- Status: Accepted
- Date: 2026-08-17

## Context

A pair must be able to branch an existing figure execution without adding occurrence-level technical overrides or making later edits leak between variants. The copy boundary must also distinguish canonical structured knowledge from conversational history.

## Decision

Duplicating a `FigureVariant` copies all structured canonical data owned by that variant, including attached `SourceReference` values. It does not copy `Note` values.

The new variant receives new stable identities for the variant and its owned children. It is independent immediately after the transaction; Core MVP stores no genealogy such as `derivedFromVariantId`.

When duplication is initiated from a `RoutineFigure`, that occurrence may switch to the new variant in the same transaction. Every other routine or etude occurrence remains linked to its previous central variant.

## Consequences

The operation has a deterministic transaction boundary and cannot produce shared mutable child rows. Sources travel with the copied technical definition, while Notes remain history on their original targets. Auditing variant lineage would require a later explicit product decision.
