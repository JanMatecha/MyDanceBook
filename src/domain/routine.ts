import type { EntityId } from './identity.js';

export interface Routine {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoutineFigure {
  readonly id: EntityId;
  readonly routineId: EntityId;
  readonly position: number;
  readonly figureId: EntityId | null;
  readonly figureVariantId: EntityId | null;
  readonly figureName: string | null;
  readonly figureVariantName: string | null;
  readonly done: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoutineWithFigures extends Routine {
  readonly routineFigures: readonly RoutineFigure[];
}

export class InvalidRoutineNameError extends Error {
  public constructor() {
    super('Název sestavy musí obsahovat 1 až 200 znaků.');
    this.name = 'InvalidRoutineNameError';
  }
}

export function toRoutineName(value: string): string {
  const name = value.trim();
  if (name.length < 1 || name.length > 200) throw new InvalidRoutineNameError();
  return name;
}
