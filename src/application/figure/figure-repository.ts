import type { FigureWithVariants } from '../../domain/figure.js';
import type { EntityId } from '../../domain/identity.js';

export interface NewFigureRecord {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly nameCs: string | null;
  readonly nameEn: string | null;
  readonly aliases?: readonly { readonly id: EntityId; readonly value: string }[] | undefined;
  readonly firstVariantId: EntityId;
  readonly firstVariantName: string;
  readonly createdAt: string;
}

export interface FigureRepository {
  listByDance(danceId: EntityId): readonly FigureWithVariants[];
  create(record: NewFigureRecord): FigureWithVariants;
  updateNames(
    figureId: EntityId,
    nameCs: string | null,
    nameEn: string | null,
    updatedAt: string,
  ): FigureWithVariants | null;
  updateVariantTiming(
    figureVariantId: EntityId,
    timingNotation: string | null,
    updatedAt: string,
  ): FigureWithVariants | null;
  addAlias(
    figureId: EntityId,
    alias: { readonly id: EntityId; readonly value: string; readonly createdAt: string },
  ): FigureWithVariants | null;
  removeAlias(aliasId: EntityId, updatedAt: string): FigureWithVariants | null | 'last_identifier';
}
