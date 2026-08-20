import type { EntityId } from './identity.js';

export interface Figure {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly nameCs: string | null;
  readonly nameEn: string | null;
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
}

export class InvalidFigureNameError extends Error {
  public constructor() {
    super('Název figury musí obsahovat 1 až 200 znaků.');
    this.name = 'InvalidFigureNameError';
  }
}

export interface FigureNames {
  readonly nameCs: string | null;
  readonly nameEn: string | null;
}

export function toFigureNames(input: FigureNames): FigureNames {
  const nameCs = normalizeOptionalText(input.nameCs, 200);
  const nameEn = normalizeOptionalText(input.nameEn, 200);
  if (!nameCs && !nameEn) throw new InvalidFigureNameError();
  return { nameCs, nameEn };
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
