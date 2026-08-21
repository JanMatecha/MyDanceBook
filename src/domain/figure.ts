import type { EntityId } from './identity.js';

export interface Figure {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly nameCs: string | null;
  readonly nameEn: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FigureAlias {
  readonly id: EntityId;
  readonly figureId: EntityId;
  readonly value: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FigureVariant {
  readonly id: EntityId;
  readonly figureId: EntityId;
  readonly name: string;
  readonly timingNotation: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FigureWithVariants extends Figure {
  readonly variants: readonly FigureVariant[];
  readonly aliases: readonly FigureAlias[];
}

export class InvalidFigureNameError extends Error {
  public constructor() {
    super('Název figury musí obsahovat 1 až 200 znaků.');
    this.name = 'InvalidFigureNameError';
  }
}
export class InvalidFigureAliasError extends Error {
  public constructor(message = 'Přezdívka figury musí obsahovat 1 až 200 znaků.') {
    super(message);
    this.name = 'InvalidFigureAliasError';
  }
}
export class InvalidFigureIdentifierError extends Error {
  public constructor() {
    super('Figura musí mít český název, anglický název nebo alespoň jednu přezdívku.');
    this.name = 'InvalidFigureIdentifierError';
  }
}

export interface FigureNames {
  readonly nameCs: string | null;
  readonly nameEn: string | null;
}

export function toFigureNames(input: FigureNames): FigureNames {
  const nameCs = normalizeOptionalText(input.nameCs, 200);
  const nameEn = normalizeOptionalText(input.nameEn, 200);
  return { nameCs, nameEn };
}

export function toFigureAliases(values: readonly string[]): readonly string[] {
  const normalized = values.map((value) => {
    const result = value.trim();
    if (result.length < 1 || result.length > 200) throw new InvalidFigureAliasError();
    return result;
  });
  if (new Set(normalized.map((value) => value.toLocaleLowerCase())).size !== normalized.length) {
    throw new InvalidFigureAliasError(
      'Stejná přezdívka může být u jedné figury uvedena jen jednou.',
    );
  }
  return normalized;
}

export function requireFigureIdentifier(names: FigureNames, aliases: readonly string[]): void {
  if (!names.nameCs && !names.nameEn && aliases.length === 0)
    throw new InvalidFigureIdentifierError();
}

export function toTimingNotation(value: string | null): string | null {
  return normalizeOptionalText(value, 200);
}

function normalizeOptionalText(value: string | null, maximumLength: number): string | null {
  const normalized = value?.trim() ?? '';
  if (normalized.length === 0) return null;
  if (normalized.length > maximumLength) throw new InvalidFigureNameError();
  return normalized;
}

export const defaultFigureVariantName = 'Výchozí varianta';
