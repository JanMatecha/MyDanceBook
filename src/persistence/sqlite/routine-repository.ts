import type { NewFigureRecord } from '../../application/figure/figure-repository.js';
import type {
  NewRoutineRecord,
  NewRoutineFigureRecord,
  RoutineFigureAssignmentResult,
  RoutineFigureMoveResult,
  RoutineRepository,
} from '../../application/routine/routine-repository.js';
import { parseEntityId, type EntityId } from '../../domain/identity.js';
import type { Routine, RoutineFigure, RoutineWithFigures } from '../../domain/routine.js';
import type { SqliteDatabase } from './database.js';

interface RoutineRow {
  readonly id: string;
  readonly dance_id: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RoutineFigureRow {
  readonly id: string;
  readonly routine_id: string;
  readonly position: number;
  readonly figure_id: string | null;
  readonly figure_variant_id: string | null;
  readonly figure_name: string | null;
  readonly figure_variant_name: string | null;
  readonly done: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RoutineFigureLocationRow {
  readonly id: string;
  readonly routine_id: string;
  readonly dance_id: string;
  readonly position: number;
}

export class SqliteRoutineRepository implements RoutineRepository {
  public constructor(private readonly database: SqliteDatabase) {}

  public listByDance(danceId: EntityId): readonly RoutineWithFigures[] {
    const routines = this.database
      .prepare(
        `SELECT id, dance_id, name, created_at, updated_at
         FROM routines WHERE dance_id = ? ORDER BY created_at, id`,
      )
      .all(danceId) as RoutineRow[];
    const figures = this.database
      .prepare(
        `SELECT routine_figures.id, routine_figures.routine_id, routine_figures.position,
                routine_figures.figure_id, routine_figures.figure_variant_id,
                figures.name AS figure_name, figure_variants.name AS figure_variant_name,
                routine_figures.done, routine_figures.created_at, routine_figures.updated_at
         FROM routine_figures
         JOIN routines ON routines.id = routine_figures.routine_id
         LEFT JOIN figures ON figures.id = routine_figures.figure_id
         LEFT JOIN figure_variants ON figure_variants.id = routine_figures.figure_variant_id
         WHERE routines.dance_id = ?
         ORDER BY routine_figures.routine_id, routine_figures.position`,
      )
      .all(danceId) as RoutineFigureRow[];
    const figuresByRoutine = new Map<string, RoutineFigure[]>();
    for (const figure of figures) {
      const current = figuresByRoutine.get(figure.routine_id) ?? [];
      current.push(mapRoutineFigure(figure));
      figuresByRoutine.set(figure.routine_id, current);
    }

    return routines.map((routine) => ({
      ...mapRoutine(routine),
      routineFigures: figuresByRoutine.get(routine.id) ?? [],
    }));
  }

  public create(record: NewRoutineRecord): Routine {
    this.database
      .prepare(
        `INSERT INTO routines (id, dance_id, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(record.id, record.danceId, record.name, record.createdAt, record.createdAt);
    return {
      id: record.id,
      danceId: record.danceId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    };
  }

  public createPlaceholder(record: NewRoutineFigureRecord): RoutineFigure | null {
    const create = this.database.transaction(() => {
      const routine = this.database
        .prepare('SELECT id FROM routines WHERE id = ?')
        .get(record.routineId) as { id: string } | undefined;
      if (!routine) return null;
      const position = this.database
        .prepare(
          'SELECT COALESCE(MAX(position), 0) + 1 AS position FROM routine_figures WHERE routine_id = ?',
        )
        .get(record.routineId) as { position: number };
      this.database
        .prepare(
          `INSERT INTO routine_figures
             (id, routine_id, position, figure_id, figure_variant_id, done, created_at, updated_at)
           VALUES (?, ?, ?, NULL, NULL, 0, ?, ?)`,
        )
        .run(record.id, record.routineId, position.position, record.createdAt, record.createdAt);
      return {
        id: record.id,
        routineId: record.routineId,
        position: position.position,
        figureId: null,
        figureVariantId: null,
        figureName: null,
        figureVariantName: null,
        done: false,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      } satisfies RoutineFigure;
    });
    return create();
  }

  public assign(
    routineFigureId: EntityId,
    figureId: EntityId,
    figureVariantId: EntityId | null,
    updatedAt: string,
  ): RoutineFigureAssignmentResult {
    const assign = this.database.transaction(() => {
      const routineFigure = this.findRoutineFigureLocation(routineFigureId);
      if (!routineFigure) return 'not_found' as const;
      if (!this.isValidAssignment(routineFigure.dance_id, figureId, figureVariantId)) {
        return 'invalid_assignment' as const;
      }
      this.database
        .prepare(
          `UPDATE routine_figures
           SET figure_id = ?, figure_variant_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(figureId, figureVariantId, updatedAt, routineFigureId);
      return 'updated' as const;
    });
    return assign();
  }

  public createFigureAndAssign(
    routineFigureId: EntityId,
    figure: Omit<NewFigureRecord, 'danceId'>,
    updatedAt: string,
  ): RoutineFigureAssignmentResult {
    const create = this.database.transaction(() => {
      const routineFigure = this.findRoutineFigureLocation(routineFigureId);
      if (!routineFigure) return 'not_found' as const;
      this.database
        .prepare(
          `INSERT INTO figures (id, dance_id, name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(figure.id, routineFigure.dance_id, figure.name, figure.createdAt, figure.createdAt);
      this.database
        .prepare(
          `INSERT INTO figure_variants (id, figure_id, name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          figure.firstVariantId,
          figure.id,
          figure.firstVariantName,
          figure.createdAt,
          figure.createdAt,
        );
      this.database
        .prepare(
          `UPDATE routine_figures
           SET figure_id = ?, figure_variant_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(figure.id, figure.firstVariantId, updatedAt, routineFigureId);
      return 'updated' as const;
    });
    return create();
  }

  public moveBefore(
    routineFigureId: EntityId,
    beforeRoutineFigureId: EntityId | null,
    updatedAt: string,
  ): RoutineFigureMoveResult {
    const move = this.database.transaction(() => {
      const current = this.findRoutineFigureLocation(routineFigureId);
      if (!current) return 'not_found' as const;
      if (beforeRoutineFigureId === routineFigureId) return 'moved' as const;

      const routineFigures = this.database
        .prepare(
          `SELECT id, routine_id, position FROM routine_figures
           WHERE routine_id = ? ORDER BY position`,
        )
        .all(current.routine_id) as Array<
        Pick<RoutineFigureLocationRow, 'id' | 'routine_id' | 'position'>
      >;
      const remaining = routineFigures.filter((item) => item.id !== routineFigureId);
      const targetIndex =
        beforeRoutineFigureId === null
          ? remaining.length
          : remaining.findIndex((item) => item.id === beforeRoutineFigureId);
      if (targetIndex === -1) return 'invalid_target' as const;

      remaining.splice(targetIndex, 0, current);
      this.database
        .prepare(
          'UPDATE routine_figures SET position = -position, updated_at = ? WHERE routine_id = ?',
        )
        .run(updatedAt, current.routine_id);
      const setPosition = this.database.prepare(
        'UPDATE routine_figures SET position = ?, updated_at = ? WHERE id = ?',
      );
      for (const [index, routineFigure] of remaining.entries()) {
        setPosition.run(index + 1, updatedAt, routineFigure.id);
      }
      return 'moved' as const;
    });
    return move();
  }

  public setDone(
    routineFigureId: EntityId,
    done: boolean,
    updatedAt: string,
  ): RoutineFigure | null {
    const update = this.database.transaction(() => {
      const row = this.database
        .prepare(
          `SELECT routine_figures.id, routine_figures.routine_id, routine_figures.position,
                  routine_figures.figure_id, routine_figures.figure_variant_id,
                  figures.name AS figure_name, figure_variants.name AS figure_variant_name,
                  routine_figures.done, routine_figures.created_at, routine_figures.updated_at
           FROM routine_figures
           LEFT JOIN figures ON figures.id = routine_figures.figure_id
           LEFT JOIN figure_variants ON figure_variants.id = routine_figures.figure_variant_id
           WHERE routine_figures.id = ?`,
        )
        .get(routineFigureId) as RoutineFigureRow | undefined;
      if (!row) return null;
      this.database
        .prepare('UPDATE routine_figures SET done = ?, updated_at = ? WHERE id = ?')
        .run(done ? 1 : 0, updatedAt, routineFigureId);
      return { ...mapRoutineFigure(row), done, updatedAt };
    });
    return update();
  }

  private findRoutineFigureLocation(
    routineFigureId: EntityId,
  ): RoutineFigureLocationRow | undefined {
    return this.database
      .prepare(
        `SELECT routine_figures.id, routine_figures.routine_id, routines.dance_id, routine_figures.position
         FROM routine_figures JOIN routines ON routines.id = routine_figures.routine_id
         WHERE routine_figures.id = ?`,
      )
      .get(routineFigureId) as RoutineFigureLocationRow | undefined;
  }

  private isValidAssignment(
    danceId: string,
    figureId: EntityId,
    figureVariantId: EntityId | null,
  ): boolean {
    const figure = this.database
      .prepare('SELECT id FROM figures WHERE id = ? AND dance_id = ?')
      .get(figureId, danceId);
    if (!figure) return false;
    if (figureVariantId === null) return true;
    return Boolean(
      this.database
        .prepare('SELECT id FROM figure_variants WHERE id = ? AND figure_id = ?')
        .get(figureVariantId, figureId),
    );
  }
}

function mapRoutine(row: RoutineRow): Routine {
  return {
    id: requireEntityId(row.id),
    danceId: requireEntityId(row.dance_id),
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutineFigure(row: RoutineFigureRow): RoutineFigure {
  return {
    id: requireEntityId(row.id),
    routineId: requireEntityId(row.routine_id),
    position: row.position,
    figureId: row.figure_id === null ? null : requireEntityId(row.figure_id),
    figureVariantId: row.figure_variant_id === null ? null : requireEntityId(row.figure_variant_id),
    figureName: row.figure_name,
    figureVariantName: row.figure_variant_name,
    done: row.done === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireEntityId(value: string): EntityId {
  const id = parseEntityId(value);
  if (!id) throw new Error(`Databáze obsahuje neplatné UUIDv7 „${value}“.`);
  return id;
}
