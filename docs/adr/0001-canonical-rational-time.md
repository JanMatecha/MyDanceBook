# ADR 0001: Canonical rational time uses TimingScheme beat units

- Status: Accepted
- Date: 2026-08-17

## Context

The model already requires exact rational time and one relative FigureVariant timeline, but a fraction such as `3/2` had no explicit unit. Persisting exact time before defining that unit would make later interpretation and migration unsafe.

## Decision

`RationalTime` is a normalized rational count of the musical beat unit defined by one `TimingScheme`.

- `1/1` means exactly one beat unit of the active TimingScheme.
- `3/2` means one and one-half beat units of that TimingScheme.
- TimingScheme defines the musical beat unit and `barLength` as RationalTime in those beat units. For example, a fictional Scheme with three beat units per bar has `barLength = 3/1`.
- FigureVariant has optional `timingSchemeId` and optional exact `duration`. Its duration and all exact child times use that Scheme's beat unit.
- A FigureVariant with no TimingScheme remains valid, but it cannot own canonical exact timeline values. Order, Notes, Steps without exact time, and natural notation remain valid.
- TimingPattern belongs to exactly one TimingScheme. Its complete-bar local offsets and durations use that Scheme's beat unit and end at the Scheme's `barLength`.
- Every TimingPatternUse in a FigureVariant, including notation-only/incomplete use, must reference a Pattern with the same `timingSchemeId` as the FigureVariant. Exact mapping from Pattern-local to Figure time is unit-preserving.
- Selecting the first Pattern for a variant with no Scheme may explicitly assign that Pattern's Scheme as part of the user command. This is not inference from notation.
- Assigning an incompatible Pattern is refused without changing existing data. Imported or legacy incompatibility is retained as `REQUIRES_REVIEW` and excluded from exact calculation until resolved.
- `entryTimingConstraint` is owned only by FigureVariant, uses the variant's TimingScheme context, and is absent while the variant has no Scheme.
- Routine `musicalStartAnchor` identifies its TimingScheme and a rational phase in that Scheme. Actual occurrence phase remains derived.
- Floating point is never canonical and natural notation never implies exact subdivision.

## Consequences

Exact times are unambiguous and can be compared or added only within a known compatible Scheme. Changing a variant's Scheme after exact data exists requires an explicit reviewed conversion or clearing/re-entry; it is never a metadata-only relabel.

Physical SQL encoding remains deferred to Phase 4. Whatever encoding is chosen must preserve normalized numerator/denominator values and Scheme context without floating-point round trips.

## Rejected alternative

Using “fraction of a bar” as the universal unit would make Step/event values less natural and would still require explicit bar context. Unqualified abstract ticks or notation-derived values were rejected because they are not musically unambiguous.
