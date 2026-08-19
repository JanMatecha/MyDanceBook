import { createEntityId, type EntityId } from '../../domain/identity.js';
import {
  defaultFigureVariantName,
  toFigureName,
  type FigureWithVariants,
} from '../../domain/figure.js';
import type { FigureRepository, NewFigureRecord } from './figure-repository.js';

export interface CreateFigureInput {
  readonly danceId: EntityId;
  readonly name: string;
}

export class CreateFigureCommand {
  public constructor(
    private readonly figures: FigureRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(input: CreateFigureInput): FigureWithVariants {
    const createdAt = this.now().toISOString();
    const record: NewFigureRecord = {
      id: this.createId(),
      danceId: input.danceId,
      name: toFigureName(input.name),
      firstVariantId: this.createId(),
      firstVariantName: defaultFigureVariantName,
      createdAt,
    };
    return this.figures.create(record);
  }
}
