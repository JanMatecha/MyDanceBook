import type { EntityId } from './identity.js';

export interface Figure {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FigureVariant {
  readonly id: EntityId;
  readonly figureId: EntityId;
  readonly name: string;
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

export function toFigureName(value: string): string {
  const name = value.trim();
  if (name.length < 1 || name.length > 200) throw new InvalidFigureNameError();
  return name;
}

export const defaultFigureVariantName = 'Výchozí varianta';
