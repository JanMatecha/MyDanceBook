import {
  defaultFigureVariantName,
  toFigureName,
  type FigureWithVariants,
} from '../../domain/figure.js';
import { createEntityId, type EntityId } from '../../domain/identity.js';
import { toRoutineName, type Routine, type RoutineFigure } from '../../domain/routine.js';
import type { NewFigureRecord } from '../figure/figure-repository.js';
import type {
  RoutineFigureAssignmentResult,
  RoutineFigureMoveResult,
  RoutineRepository,
} from './routine-repository.js';

export interface CreateRoutineInput {
  readonly danceId: EntityId;
  readonly name: string;
}

export class CreateRoutineCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(input: CreateRoutineInput): Routine {
    const createdAt = this.now().toISOString();
    return this.routines.create({
      id: this.createId(),
      danceId: input.danceId,
      name: toRoutineName(input.name),
      createdAt,
    });
  }
}

export class AddRoutineFigurePlaceholderCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineId: EntityId): RoutineFigure | null {
    return this.routines.createPlaceholder({
      id: this.createId(),
      routineId,
      createdAt: this.now().toISOString(),
    });
  }
}

export class AssignRoutineFigureCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(
    routineFigureId: EntityId,
    figureId: EntityId,
    figureVariantId: EntityId | null,
  ): RoutineFigureAssignmentResult {
    return this.routines.assign(
      routineFigureId,
      figureId,
      figureVariantId,
      this.now().toISOString(),
    );
  }
}

export class CreateFigureForRoutineFigureCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineFigureId: EntityId, name: string): RoutineFigureAssignmentResult {
    const createdAt = this.now().toISOString();
    const figure: Omit<NewFigureRecord, 'danceId'> = {
      id: this.createId(),
      name: toFigureName(name),
      firstVariantId: this.createId(),
      firstVariantName: defaultFigureVariantName,
      createdAt,
    };
    return this.routines.createFigureAndAssign(routineFigureId, figure, createdAt);
  }
}

export class MoveRoutineFigureCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(
    routineFigureId: EntityId,
    beforeRoutineFigureId: EntityId | null,
  ): RoutineFigureMoveResult {
    return this.routines.moveBefore(
      routineFigureId,
      beforeRoutineFigureId,
      this.now().toISOString(),
    );
  }
}

export class SetRoutineFigureDoneCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineFigureId: EntityId, done: boolean): RoutineFigure | null {
    return this.routines.setDone(routineFigureId, done, this.now().toISOString());
  }
}

export type { FigureWithVariants };
