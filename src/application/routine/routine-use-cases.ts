import {
  defaultFigureVariantName,
  toFigureName,
  type FigureWithVariants,
} from '../../domain/figure.js';
import { createEntityId, type EntityId } from '../../domain/identity.js';
import {
  defaultRoutineSectionName,
  toRoutineName,
  toRoutineSectionName,
  type RoutineFigure,
  type RoutineSection,
  type RoutineWithSections,
} from '../../domain/routine.js';
import type { NewFigureRecord } from '../figure/figure-repository.js';
import type {
  RoutineFigureAssignmentResult,
  RoutineFigureMoveResult,
  RoutineRepository,
  RoutineSectionMoveResult,
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

  public execute(input: CreateRoutineInput): RoutineWithSections {
    const createdAt = this.now().toISOString();
    return this.routines.create({
      id: this.createId(),
      danceId: input.danceId,
      name: toRoutineName(input.name),
      firstSectionId: this.createId(),
      firstSectionName: defaultRoutineSectionName,
      createdAt,
    });
  }
}

export class CreateRoutineSectionCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineId: EntityId, name: string): RoutineSection | null {
    return this.routines.createSection({
      id: this.createId(),
      routineId,
      name: toRoutineSectionName(name),
      createdAt: this.now().toISOString(),
    });
  }
}

export class RenameRoutineSectionCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineSectionId: EntityId, name: string): RoutineSection | null {
    return this.routines.renameSection(
      routineSectionId,
      toRoutineSectionName(name),
      this.now().toISOString(),
    );
  }
}

export class MoveRoutineSectionCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(
    routineSectionId: EntityId,
    beforeRoutineSectionId: EntityId | null,
  ): RoutineSectionMoveResult {
    return this.routines.moveSectionBefore(
      routineSectionId,
      beforeRoutineSectionId,
      this.now().toISOString(),
    );
  }
}

export class AddRoutineFigurePlaceholderCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly createId: () => EntityId = createEntityId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineSectionId: EntityId): RoutineFigure | null {
    return this.routines.createPlaceholder({
      id: this.createId(),
      sectionId: routineSectionId,
      createdAt: this.now().toISOString(),
    });
  }
}

export class MoveRoutineFigureToSectionCommand {
  public constructor(
    private readonly routines: RoutineRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(routineFigureId: EntityId, routineSectionId: EntityId): RoutineFigureMoveResult {
    return this.routines.moveToSection(routineFigureId, routineSectionId, this.now().toISOString());
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
