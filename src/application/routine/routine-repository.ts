import type { NewFigureRecord } from '../figure/figure-repository.js';
import type { Routine, RoutineFigure, RoutineWithFigures } from '../../domain/routine.js';
import type { EntityId } from '../../domain/identity.js';

export interface NewRoutineRecord {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly name: string;
  readonly createdAt: string;
}

export interface NewRoutineFigureRecord {
  readonly id: EntityId;
  readonly routineId: EntityId;
  readonly createdAt: string;
}

export type RoutineFigureAssignmentResult = 'updated' | 'not_found' | 'invalid_assignment';
export type RoutineFigureMoveResult = 'moved' | 'not_found' | 'invalid_target';

export interface RoutineRepository {
  listByDance(danceId: EntityId): readonly RoutineWithFigures[];
  create(record: NewRoutineRecord): Routine;
  createPlaceholder(record: NewRoutineFigureRecord): RoutineFigure | null;
  assign(
    routineFigureId: EntityId,
    figureId: EntityId,
    figureVariantId: EntityId | null,
    updatedAt: string,
  ): RoutineFigureAssignmentResult;
  createFigureAndAssign(
    routineFigureId: EntityId,
    figure: Omit<NewFigureRecord, 'danceId'>,
    updatedAt: string,
  ): RoutineFigureAssignmentResult;
  moveBefore(
    routineFigureId: EntityId,
    beforeRoutineFigureId: EntityId | null,
    updatedAt: string,
  ): RoutineFigureMoveResult;
  setDone(routineFigureId: EntityId, done: boolean, updatedAt: string): RoutineFigure | null;
}
