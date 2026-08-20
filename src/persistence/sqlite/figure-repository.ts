import type {
  FigureRepository,
  NewFigureRecord,
} from '../../application/figure/figure-repository.js';
import type { FigureVariant, FigureWithVariants } from '../../domain/figure.js';
import { parseEntityId, type EntityId } from '../../domain/identity.js';
import type { SqliteDatabase } from './database.js';

interface FigureRow {
  readonly id: string;
  readonly dance_id: string;
  readonly name_cs: string | null;
  readonly name_en: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface FigureVariantRow {
  readonly id: string;
  readonly figure_id: string;
  readonly name: string;
  readonly timing_notation: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export class SqliteFigureRepository implements FigureRepository {
  public constructor(private readonly database: SqliteDatabase) {}

  public listByDance(danceId: EntityId): readonly FigureWithVariants[] {
    const figures = this.database
      .prepare(
        `SELECT id, dance_id, name_cs, name_en, created_at, updated_at
         FROM figures WHERE dance_id = ? ORDER BY COALESCE(name_cs, name_en) COLLATE NOCASE, id`,
      )
      .all(danceId) as FigureRow[];
    const variants = this.database
      .prepare(
        `SELECT figure_variants.id, figure_variants.figure_id, figure_variants.name,
                figure_variants.timing_notation, figure_variants.created_at, figure_variants.updated_at
         FROM figure_variants
         JOIN figures ON figures.id = figure_variants.figure_id
         WHERE figures.dance_id = ?
         ORDER BY figure_variants.created_at, figure_variants.id`,
      )
      .all(danceId) as FigureVariantRow[];
    const variantsByFigure = new Map<string, FigureVariant[]>();
    for (const variant of variants) {
      const current = variantsByFigure.get(variant.figure_id) ?? [];
      current.push(mapVariant(variant));
      variantsByFigure.set(variant.figure_id, current);
    }

    return figures.map((figure) => ({
      ...mapFigure(figure),
      variants: variantsByFigure.get(figure.id) ?? [],
    }));
  }

  public create(record: NewFigureRecord): FigureWithVariants {
    const create = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO figures (id, dance_id, name_cs, name_en, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          record.id,
          record.danceId,
          record.nameCs,
          record.nameEn,
          record.createdAt,
          record.createdAt,
        );
      this.database
        .prepare(
          `INSERT INTO figure_variants (id, figure_id, name, timing_notation, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?)`,
        )
        .run(
          record.firstVariantId,
          record.id,
          record.firstVariantName,
          record.createdAt,
          record.createdAt,
        );
    });
    create();

    return {
      id: record.id,
      danceId: record.danceId,
      nameCs: record.nameCs,
      nameEn: record.nameEn,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
      variants: [
        {
          id: record.firstVariantId,
          figureId: record.id,
          name: record.firstVariantName,
          timingNotation: null,
          createdAt: record.createdAt,
          updatedAt: record.createdAt,
        },
      ],
    };
  }

  public updateNames(
    figureId: EntityId,
    nameCs: string | null,
    nameEn: string | null,
    updatedAt: string,
  ): FigureWithVariants | null {
    const figure = this.database
      .prepare(
        `SELECT id, dance_id, name_cs, name_en, created_at, updated_at
         FROM figures WHERE id = ?`,
      )
      .get(figureId) as FigureRow | undefined;
    if (!figure) return null;

    this.database
      .prepare('UPDATE figures SET name_cs = ?, name_en = ?, updated_at = ? WHERE id = ?')
      .run(nameCs, nameEn, updatedAt, figureId);
    const variants = this.database
      .prepare(
        `SELECT id, figure_id, name, timing_notation, created_at, updated_at
         FROM figure_variants WHERE figure_id = ?
         ORDER BY created_at, id`,
      )
      .all(figureId) as FigureVariantRow[];

    return {
      ...mapFigure({ ...figure, name_cs: nameCs, name_en: nameEn, updated_at: updatedAt }),
      variants: variants.map(mapVariant),
    };
  }

  public updateVariantTiming(
    figureVariantId: EntityId,
    timingNotation: string | null,
    updatedAt: string,
  ): FigureWithVariants | null {
    const variant = this.database
      .prepare(
        `SELECT id, figure_id, name, timing_notation, created_at, updated_at
         FROM figure_variants WHERE id = ?`,
      )
      .get(figureVariantId) as FigureVariantRow | undefined;
    if (!variant) return null;
    this.database
      .prepare('UPDATE figure_variants SET timing_notation = ?, updated_at = ? WHERE id = ?')
      .run(timingNotation, updatedAt, figureVariantId);
    const figure = this.database
      .prepare(
        `SELECT id, dance_id, name_cs, name_en, created_at, updated_at
         FROM figures WHERE id = ?`,
      )
      .get(variant.figure_id) as FigureRow;
    const variants = this.database
      .prepare(
        `SELECT id, figure_id, name, timing_notation, created_at, updated_at
         FROM figure_variants WHERE figure_id = ? ORDER BY created_at, id`,
      )
      .all(variant.figure_id) as FigureVariantRow[];
    return { ...mapFigure(figure), variants: variants.map(mapVariant) };
  }
}

function mapFigure(row: FigureRow): Omit<FigureWithVariants, 'variants'> {
  return {
    id: requireEntityId(row.id),
    danceId: requireEntityId(row.dance_id),
    nameCs: row.name_cs,
    nameEn: row.name_en,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVariant(row: FigureVariantRow): FigureVariant {
  return {
    id: requireEntityId(row.id),
    figureId: requireEntityId(row.figure_id),
    name: row.name,
    timingNotation: row.timing_notation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireEntityId(value: string): EntityId {
  const id = parseEntityId(value);
  if (!id) throw new Error(`Databáze obsahuje neplatné UUIDv7 „${value}“.`);
  return id;
}
