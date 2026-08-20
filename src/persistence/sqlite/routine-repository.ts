import type { NewFigureRecord } from '../../application/figure/figure-repository.js';
import type {
  NewRoutineFigureRecord,
  NewRoutineRecord,
  NewRoutineSectionRecord,
  RoutineFigureAssignmentResult,
  RoutineFigureMoveResult,
  RoutineFigureRemoveResult,
  RoutineRepository,
  RoutineSectionMoveResult,
} from '../../application/routine/routine-repository.js';
import { parseEntityId, type EntityId } from '../../domain/identity.js';
import type {
  Routine,
  RoutineFigure,
  RoutineSection,
  RoutineSectionWithFigures,
  RoutineWithSections,
} from '../../domain/routine.js';
import type { SqliteDatabase } from './database.js';

interface RoutineRow {
  readonly id: string;
  readonly dance_id: string;
  readonly name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RoutineSectionRow {
  readonly id: string;
  readonly routine_id: string;
  readonly name: string;
  readonly position: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RoutineFigureRow {
  readonly id: string;
  readonly section_id: string;
  readonly position: number;
  readonly figure_id: string | null;
  readonly figure_variant_id: string | null;
  readonly figure_name_cs: string | null;
  readonly figure_name_en: string | null;
  readonly figure_variant_name: string | null;
  readonly figure_variant_timing_notation: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RoutineFigureLocationRow {
  readonly id: string;
  readonly section_id: string;
  readonly routine_id: string;
  readonly dance_id: string;
  readonly position: number;
}

interface OrderedLocationRow {
  readonly id: string;
  readonly position: number;
}

export class SqliteRoutineRepository implements RoutineRepository {
  public constructor(private readonly database: SqliteDatabase) {}

  public listByDance(danceId: EntityId): readonly RoutineWithSections[] {
    const routines = this.database
      .prepare(
        `SELECT id, dance_id, name, created_at, updated_at
         FROM routines WHERE dance_id = ? ORDER BY created_at, id`,
      )
      .all(danceId) as RoutineRow[];
    const sections = this.database
      .prepare(
        `SELECT routine_sections.id, routine_sections.routine_id, routine_sections.name,
                routine_sections.position, routine_sections.created_at, routine_sections.updated_at
         FROM routine_sections
         JOIN routines ON routines.id = routine_sections.routine_id
         WHERE routines.dance_id = ?
         ORDER BY routine_sections.routine_id, routine_sections.position`,
      )
      .all(danceId) as RoutineSectionRow[];
    const figures = this.database
      .prepare(
        `SELECT routine_figures.id, routine_figures.section_id, routine_figures.position,
                routine_figures.figure_id, routine_figures.figure_variant_id,
                figures.name_cs AS figure_name_cs, figures.name_en AS figure_name_en,
                figure_variants.name AS figure_variant_name,
                figure_variants.timing_notation AS figure_variant_timing_notation,
                routine_figures.created_at, routine_figures.updated_at
         FROM routine_figures
         JOIN routine_sections ON routine_sections.id = routine_figures.section_id
         JOIN routines ON routines.id = routine_sections.routine_id
         LEFT JOIN figures ON figures.id = routine_figures.figure_id
         LEFT JOIN figure_variants ON figure_variants.id = routine_figures.figure_variant_id
         WHERE routines.dance_id = ?
         ORDER BY routine_sections.routine_id, routine_sections.position, routine_figures.position`,
      )
      .all(danceId) as RoutineFigureRow[];

    const figuresBySection = new Map<string, RoutineFigure[]>();
    for (const figure of figures) {
      const current = figuresBySection.get(figure.section_id) ?? [];
      current.push(mapRoutineFigure(figure));
      figuresBySection.set(figure.section_id, current);
    }

    const sectionsByRoutine = new Map<string, RoutineSectionWithFigures[]>();
    for (const section of sections) {
      const current = sectionsByRoutine.get(section.routine_id) ?? [];
      current.push({
        ...mapRoutineSection(section),
        routineFigures: figuresBySection.get(section.id) ?? [],
      });
      sectionsByRoutine.set(section.routine_id, current);
    }

    return routines.map((routine) => ({
      ...mapRoutine(routine),
      sections: sectionsByRoutine.get(routine.id) ?? [],
    }));
  }

  public create(record: NewRoutineRecord): RoutineWithSections {
    const create = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO routines (id, dance_id, name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(record.id, record.danceId, record.name, record.createdAt, record.createdAt);
      this.database
        .prepare(
          `INSERT INTO routine_sections
             (id, routine_id, name, position, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?)`,
        )
        .run(
          record.firstSectionId,
          record.id,
          record.firstSectionName,
          record.createdAt,
          record.createdAt,
        );
      return {
        id: record.id,
        danceId: record.danceId,
        name: record.name,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
        sections: [
          {
            id: record.firstSectionId,
            routineId: record.id,
            name: record.firstSectionName,
            position: 1,
            createdAt: record.createdAt,
            updatedAt: record.createdAt,
            routineFigures: [],
          },
        ],
      } satisfies RoutineWithSections;
    });
    return create();
  }

  public createSection(record: NewRoutineSectionRecord): RoutineSection | null {
    const create = this.database.transaction(() => {
      const routine = this.database
        .prepare('SELECT id FROM routines WHERE id = ?')
        .get(record.routineId) as { id: string } | undefined;
      if (!routine) return null;
      const position = this.database
        .prepare(
          `SELECT COALESCE(MAX(position), 0) + 1 AS position
           FROM routine_sections WHERE routine_id = ?`,
        )
        .get(record.routineId) as { position: number };
      this.database
        .prepare(
          `INSERT INTO routine_sections
             (id, routine_id, name, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          record.id,
          record.routineId,
          record.name,
          position.position,
          record.createdAt,
          record.createdAt,
        );
      return {
        id: record.id,
        routineId: record.routineId,
        name: record.name,
        position: position.position,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      } satisfies RoutineSection;
    });
    return create();
  }

  public renameSection(
    routineSectionId: EntityId,
    name: string,
    updatedAt: string,
  ): RoutineSection | null {
    const update = this.database.transaction(() => {
      const row = this.database
        .prepare(
          `SELECT id, routine_id, name, position, created_at, updated_at
           FROM routine_sections WHERE id = ?`,
        )
        .get(routineSectionId) as RoutineSectionRow | undefined;
      if (!row) return null;
      this.database
        .prepare('UPDATE routine_sections SET name = ?, updated_at = ? WHERE id = ?')
        .run(name, updatedAt, routineSectionId);
      return { ...mapRoutineSection(row), name, updatedAt };
    });
    return update();
  }

  public moveSectionBefore(
    routineSectionId: EntityId,
    beforeRoutineSectionId: EntityId | null,
    updatedAt: string,
  ): RoutineSectionMoveResult {
    const move = this.database.transaction(() => {
      const current = this.database
        .prepare('SELECT id, routine_id, position FROM routine_sections WHERE id = ?')
        .get(routineSectionId) as
        Pick<RoutineSectionRow, 'id' | 'routine_id' | 'position'> | undefined;
      if (!current) return 'not_found' as const;
      if (beforeRoutineSectionId === routineSectionId) return 'moved' as const;

      const sections = this.database
        .prepare(
          `SELECT id, position FROM routine_sections
           WHERE routine_id = ? ORDER BY position`,
        )
        .all(current.routine_id) as OrderedLocationRow[];
      const remaining = sections.filter((item) => item.id !== routineSectionId);
      const targetIndex =
        beforeRoutineSectionId === null
          ? remaining.length
          : remaining.findIndex((item) => item.id === beforeRoutineSectionId);
      if (targetIndex === -1) return 'invalid_target' as const;

      remaining.splice(targetIndex, 0, current);
      this.stageSectionPositions(current.routine_id, sections, updatedAt);
      const setPosition = this.database.prepare(
        'UPDATE routine_sections SET position = ?, updated_at = ? WHERE id = ?',
      );
      for (const [index, section] of remaining.entries()) {
        setPosition.run(index + 1, updatedAt, section.id);
      }
      return 'moved' as const;
    });
    return move();
  }

  public createPlaceholder(record: NewRoutineFigureRecord): RoutineFigure | null {
    const create = this.database.transaction(() => {
      const section = this.database
        .prepare('SELECT id FROM routine_sections WHERE id = ?')
        .get(record.sectionId) as { id: string } | undefined;
      if (!section) return null;
      const position = this.database
        .prepare(
          `SELECT COALESCE(MAX(position), 0) + 1 AS position
           FROM routine_figures WHERE section_id = ?`,
        )
        .get(record.sectionId) as { position: number };
      this.database
        .prepare(
          `INSERT INTO routine_figures
             (id, section_id, position, figure_id, figure_variant_id, created_at, updated_at)
           VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
        )
        .run(record.id, record.sectionId, position.position, record.createdAt, record.createdAt);
      return {
        id: record.id,
        sectionId: record.sectionId,
        position: position.position,
        figureId: null,
        figureVariantId: null,
        figureNameCs: null,
        figureNameEn: null,
        figureVariantName: null,
        figureVariantTimingNotation: null,
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
      const resolvedVariantId = this.resolveSoleVariantId(figureId, figureVariantId);
      if (!this.isValidAssignment(routineFigure.dance_id, figureId, resolvedVariantId)) {
        return 'invalid_assignment' as const;
      }
      this.database
        .prepare(
          `UPDATE routine_figures
           SET figure_id = ?, figure_variant_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(figureId, resolvedVariantId, updatedAt, routineFigureId);
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
          `INSERT INTO figures (id, dance_id, name_cs, name_en, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          figure.id,
          routineFigure.dance_id,
          figure.nameCs,
          figure.nameEn,
          figure.createdAt,
          figure.createdAt,
        );
      this.database
        .prepare(
          `INSERT INTO figure_variants (id, figure_id, name, timing_notation, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?)`,
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
          `SELECT id, position FROM routine_figures
           WHERE section_id = ? ORDER BY position`,
        )
        .all(current.section_id) as OrderedLocationRow[];
      const remaining = routineFigures.filter((item) => item.id !== routineFigureId);
      const targetIndex =
        beforeRoutineFigureId === null
          ? remaining.length
          : remaining.findIndex((item) => item.id === beforeRoutineFigureId);
      if (targetIndex === -1) return 'invalid_target' as const;

      remaining.splice(targetIndex, 0, current);
      this.stageRoutineFigurePositions(current.section_id, routineFigures, updatedAt);
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

  public moveToSection(
    routineFigureId: EntityId,
    routineSectionId: EntityId,
    updatedAt: string,
  ): RoutineFigureMoveResult {
    const move = this.database.transaction(() => {
      const current = this.findRoutineFigureLocation(routineFigureId);
      if (!current) return 'not_found' as const;
      const target = this.database
        .prepare('SELECT id, routine_id FROM routine_sections WHERE id = ?')
        .get(routineSectionId) as Pick<RoutineSectionRow, 'id' | 'routine_id'> | undefined;
      if (!target || target.routine_id !== current.routine_id) return 'invalid_target' as const;
      if (target.id === current.section_id) return 'moved' as const;

      const targetPosition = this.database
        .prepare(
          `SELECT COALESCE(MAX(position), 0) + 1 AS position
           FROM routine_figures WHERE section_id = ?`,
        )
        .get(target.id) as { position: number };
      this.database
        .prepare(
          `UPDATE routine_figures
           SET section_id = ?, position = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(target.id, targetPosition.position, updatedAt, routineFigureId);

      const sourceFigures = this.database
        .prepare(
          `SELECT id, position FROM routine_figures
           WHERE section_id = ? ORDER BY position`,
        )
        .all(current.section_id) as OrderedLocationRow[];
      const setPosition = this.database.prepare(
        'UPDATE routine_figures SET position = ?, updated_at = ? WHERE id = ?',
      );
      for (const [index, routineFigure] of sourceFigures.entries()) {
        if (routineFigure.position !== index + 1) {
          setPosition.run(index + 1, updatedAt, routineFigure.id);
        }
      }
      return 'moved' as const;
    });
    return move();
  }

  public remove(routineFigureId: EntityId, updatedAt: string): RoutineFigureRemoveResult {
    const remove = this.database.transaction(() => {
      const current = this.findRoutineFigureLocation(routineFigureId);
      if (!current) return 'not_found' as const;

      this.database.prepare('DELETE FROM routine_figures WHERE id = ?').run(routineFigureId);
      const remaining = this.database
        .prepare(
          `SELECT id, position FROM routine_figures
           WHERE section_id = ? ORDER BY position`,
        )
        .all(current.section_id) as OrderedLocationRow[];
      const setPosition = this.database.prepare(
        'UPDATE routine_figures SET position = ?, updated_at = ? WHERE id = ?',
      );
      for (const [index, routineFigure] of remaining.entries()) {
        if (routineFigure.position !== index + 1) {
          setPosition.run(index + 1, updatedAt, routineFigure.id);
        }
      }
      return 'removed' as const;
    });
    return remove();
  }

  private stageSectionPositions(
    routineId: string,
    sections: readonly OrderedLocationRow[],
    updatedAt: string,
  ): void {
    const maximum = sections.at(-1)?.position ?? 0;
    const offset = maximum + sections.length + 1;
    this.database
      .prepare(
        `UPDATE routine_sections
         SET position = position + ?, updated_at = ?
         WHERE routine_id = ?`,
      )
      .run(offset, updatedAt, routineId);
  }

  private stageRoutineFigurePositions(
    sectionId: string,
    routineFigures: readonly OrderedLocationRow[],
    updatedAt: string,
  ): void {
    const maximum = routineFigures.at(-1)?.position ?? 0;
    const offset = maximum + routineFigures.length + 1;
    this.database
      .prepare(
        `UPDATE routine_figures
         SET position = position + ?, updated_at = ?
         WHERE section_id = ?`,
      )
      .run(offset, updatedAt, sectionId);
  }

  private findRoutineFigureLocation(
    routineFigureId: EntityId,
  ): RoutineFigureLocationRow | undefined {
    return this.database
      .prepare(
        `SELECT routine_figures.id, routine_figures.section_id,
                routine_sections.routine_id, routines.dance_id, routine_figures.position
         FROM routine_figures
         JOIN routine_sections ON routine_sections.id = routine_figures.section_id
         JOIN routines ON routines.id = routine_sections.routine_id
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

  private resolveSoleVariantId(
    figureId: EntityId,
    requestedVariantId: EntityId | null,
  ): EntityId | null {
    if (requestedVariantId !== null) return requestedVariantId;
    const variants = this.database
      .prepare('SELECT id FROM figure_variants WHERE figure_id = ? ORDER BY created_at, id LIMIT 2')
      .all(figureId) as { id: string }[];
    return variants.length === 1 ? requireEntityId(variants[0]?.id ?? '') : null;
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

function mapRoutineSection(row: RoutineSectionRow): RoutineSection {
  return {
    id: requireEntityId(row.id),
    routineId: requireEntityId(row.routine_id),
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutineFigure(row: RoutineFigureRow): RoutineFigure {
  return {
    id: requireEntityId(row.id),
    sectionId: requireEntityId(row.section_id),
    position: row.position,
    figureId: row.figure_id === null ? null : requireEntityId(row.figure_id),
    figureVariantId: row.figure_variant_id === null ? null : requireEntityId(row.figure_variant_id),
    figureNameCs: row.figure_name_cs,
    figureNameEn: row.figure_name_en,
    figureVariantName: row.figure_variant_name,
    figureVariantTimingNotation: row.figure_variant_timing_notation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireEntityId(value: string): EntityId {
  const id = parseEntityId(value);
  if (!id) throw new Error(`Databáze obsahuje neplatné UUIDv7 „${value}“.`);
  return id;
}
