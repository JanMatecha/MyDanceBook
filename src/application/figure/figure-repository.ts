import type { FigureWithVariants } from '../../domain/figure.js';
import type { EntityId } from '../../domain/identity.js';

export interface NewFigureRecord {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly name: string;
  readonly firstVariantId: EntityId;
  readonly firstVariantName: string;
  readonly createdAt: string;
}

export interface FigureRepository {
  listByDance(danceId: EntityId): readonly FigureWithVariants[];
  create(record: NewFigureRecord): FigureWithVariants;
}
