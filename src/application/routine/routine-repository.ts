import type { NewFigureRecord } from '../figure/figure-repository.js';
import type { RoutineFigure, RoutineSection, RoutineWithSections } from '../../domain/routine.js';
import type { EntityId } from '../../domain/identity.js';

export interface NewRoutineRecord {
  readonly id: EntityId;
  readonly danceId: EntityId;
  readonly name: string;
  readonly firstSectionId: EntityId;
  readonly firstSectionName: string;
  readonly createdAt: string;
}

export interface NewRoutineSectionRecord {
  readonly id: EntityId;
  readonly routineId: EntityId;
  readonly name: string;
  readonly createdAt: string;
}

export interface NewRoutineFigureRecord {
  readonly id: EntityId;
  readonly sectionId: EntityId;
  readonly createdAt: string;
}

export type RoutineFigureAssignmentResult = 'updated' | 'not_found' | 'invalid_assignment';
export type RoutineFigureMoveResult = 'moved' | 'not_found' | 'invalid_target';
export type RoutineFigureRemoveResult = 'removed' | 'not_found';
export type RoutineSectionMoveResult = 'moved' | 'not_found' | 'invalid_target';

export interface RoutineRepository {
  listByDance(danceId: EntityId): readonly RoutineWithSections[];
  create(record: NewRoutineRecord): RoutineWithSections;
  createSection(record: NewRoutineSectionRecord): RoutineSection | null;
  renameSection(routineSectionId: EntityId, name: string, updatedAt: string): RoutineSection | null;
  moveSectionBefore(
    routineSectionId: EntityId,
    beforeRoutineSectionId: EntityId | null,
    updatedAt: string,
  ): RoutineSectionMoveResult;
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
  moveToSection(
    routineFigureId: EntityId,
    routineSectionId: EntityId,
    updatedAt: string,
  ): RoutineFigureMoveResult;
  remove(routineFigureId: EntityId, updatedAt: string): RoutineFigureRemoveResult;
  setDone(routineFigureId: EntityId, done: boolean, updatedAt: string): RoutineFigure | null;
}
