import { createEntityId, type EntityId } from '../../domain/identity.js';
import {
  defaultFigureVariantName,
  toFigureNames,
  toTimingNotation,
  type FigureWithVariants,
} from '../../domain/figure.js';
import type { FigureRepository, NewFigureRecord } from './figure-repository.js';

export interface CreateFigureInput {
  readonly danceId: EntityId;
  readonly nameCs: string | null;
  readonly nameEn: string | null;
}

export interface UpdateFigureNamesInput {
  readonly nameCs: string | null;
  readonly nameEn: string | null;
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
      ...toFigureNames(input),
      firstVariantId: this.createId(),
      firstVariantName: defaultFigureVariantName,
      createdAt,
    };
    return this.figures.create(record);
  }
}

export class UpdateFigureNamesCommand {
  public constructor(
    private readonly figures: FigureRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(figureId: EntityId, input: UpdateFigureNamesInput): FigureWithVariants | null {
    const names = toFigureNames(input);
    return this.figures.updateNames(figureId, names.nameCs, names.nameEn, this.now().toISOString());
  }
}

export class UpdateFigureVariantTimingCommand {
  public constructor(
    private readonly figures: FigureRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(
    figureVariantId: EntityId,
    timingNotation: string | null,
  ): FigureWithVariants | null {
    return this.figures.updateVariantTiming(
      figureVariantId,
      toTimingNotation(timingNotation),
      this.now().toISOString(),
    );
  }
}
