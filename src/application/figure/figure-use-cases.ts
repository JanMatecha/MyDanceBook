import { createEntityId, type EntityId } from '../../domain/identity.js';
import {
  defaultFigureVariantName,
  toFigureNames,
  toFigureAliases,
  requireFigureIdentifier,
  toTimingNotation,
  type FigureWithVariants,
} from '../../domain/figure.js';
import type { FigureRepository, NewFigureRecord } from './figure-repository.js';

export interface CreateFigureInput {
  readonly danceId: EntityId;
  readonly nameCs: string | null;
  readonly nameEn: string | null;
  readonly aliases?: readonly string[] | undefined;
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
    const names = toFigureNames(input);
    const aliases = toFigureAliases(input.aliases ?? []);
    requireFigureIdentifier(names, aliases);
    const record: NewFigureRecord = {
      id: this.createId(),
      danceId: input.danceId,
      ...names,
      aliases: aliases.map((value) => ({ id: this.createId(), value })),
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
    // The repository atomically checks persisted aliases before accepting empty names.
    return this.figures.updateNames(figureId, names.nameCs, names.nameEn, this.now().toISOString());
  }
}

export class AddFigureAliasCommand {
  public constructor(
    private readonly figures: FigureRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}
  public execute(figureId: EntityId, alias: string): FigureWithVariants | null {
    const value = toFigureAliases([alias])[0]!;
    return this.figures.addAlias(figureId, {
      id: this.createId(),
      value,
      createdAt: this.now().toISOString(),
    });
  }
}
export class RemoveFigureAliasCommand {
  public constructor(
    private readonly figures: FigureRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}
  public execute(aliasId: EntityId): FigureWithVariants | null | 'last_identifier' {
    return this.figures.removeAlias(aliasId, this.now().toISOString());
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
