import type { EntityId } from './identity.js';

export interface Routine {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoutineSection {
  readonly id: EntityId;
  readonly routineId: EntityId;
  readonly name: string;
  readonly position: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoutineFigure {
  readonly id: EntityId;
  readonly sectionId: EntityId;
  readonly position: number;
  readonly figureId: EntityId | null;
  readonly figureVariantId: EntityId | null;
  readonly figureNameCs: string | null;
  readonly figureNameEn: string | null;
  readonly figureVariantName: string | null;
  readonly figureVariantTimingNotation: string | null;
  readonly done: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoutineSectionWithFigures extends RoutineSection {
  readonly routineFigures: readonly RoutineFigure[];
}

export interface RoutineWithSections extends Routine {
  readonly sections: readonly RoutineSectionWithFigures[];
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

export class InvalidRoutineSectionNameError extends Error {
  public constructor() {
    super('Název části sestavy musí obsahovat 1 až 200 znaků.');
    this.name = 'InvalidRoutineSectionNameError';
  }
}

export function toRoutineSectionName(value: string): string {
  const name = value.trim();
  if (name.length < 1 || name.length > 200) throw new InvalidRoutineSectionNameError();
  return name;
}

export const defaultRoutineSectionName = 'Část 1';
