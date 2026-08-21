import type {
  FigureRepository,
  NewFigureRecord,
} from '../../application/figure/figure-repository.js';
import {
  InvalidFigureIdentifierError,
  type FigureAlias,
  type FigureVariant,
  type FigureWithVariants,
} from '../../domain/figure.js';
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
interface FigureAliasRow {
  readonly id: string;
  readonly figure_id: string;
  readonly value: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export class SqliteFigureRepository implements FigureRepository {
  public constructor(private readonly database: SqliteDatabase) {}

  public listByDance(danceId: EntityId): readonly FigureWithVariants[] {
    const figures = this.database
      .prepare(
        `SELECT id, dance_id, name_cs, name_en, created_at, updated_at
         FROM figures WHERE dance_id = ? ORDER BY COALESCE(name_cs, name_en, id) COLLATE NOCASE, id`,
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

    const aliasesByFigure = this.aliasesByFigure(danceId);
    return figures.map((figure) => ({
      ...mapFigure(figure),
      variants: variantsByFigure.get(figure.id) ?? [],
      aliases: aliasesByFigure.get(figure.id) ?? [],
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
      const insertAlias = this.database.prepare(
        `INSERT INTO figure_aliases (id, figure_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      );
      for (const alias of record.aliases ?? [])
        insertAlias.run(alias.id, record.id, alias.value, record.createdAt, record.createdAt);
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
      aliases: (record.aliases ?? []).map((alias) => ({
        ...alias,
        figureId: record.id,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      })),
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

    const aliases = this.aliasesForFigure(figureId);
    if (!nameCs && !nameEn && aliases.length === 0) throw new InvalidFigureIdentifierError();
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
      aliases,
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
    return {
      ...mapFigure(figure),
      variants: variants.map(mapVariant),
      aliases: this.aliasesForFigure(requireEntityId(variant.figure_id)),
    };
  }

  public addAlias(
    figureId: EntityId,
    alias: { readonly id: EntityId; readonly value: string; readonly createdAt: string },
  ): FigureWithVariants | null {
    const add = this.database.transaction(() => {
      const figure = this.findFigure(figureId);
      if (!figure) return null;
      this.database
        .prepare(
          `INSERT INTO figure_aliases (id, figure_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(alias.id, figureId, alias.value, alias.createdAt, alias.createdAt);
      this.database
        .prepare('UPDATE figures SET updated_at = ? WHERE id = ?')
        .run(alias.createdAt, figureId);
      return this.aggregate({ ...figure, updated_at: alias.createdAt });
    });
    return add();
  }
  public removeAlias(
    aliasId: EntityId,
    updatedAt: string,
  ): FigureWithVariants | null | 'last_identifier' {
    const remove = this.database.transaction(() => {
      const alias = this.database
        .prepare('SELECT id, figure_id FROM figure_aliases WHERE id = ?')
        .get(aliasId) as { id: string; figure_id: string } | undefined;
      if (!alias) return null;
      const figure = this.findFigure(requireEntityId(alias.figure_id))!;
      if (
        !figure.name_cs &&
        !figure.name_en &&
        this.aliasesForFigure(requireEntityId(alias.figure_id)).length === 1
      )
        return 'last_identifier' as const;
      this.database.prepare('DELETE FROM figure_aliases WHERE id = ?').run(aliasId);
      this.database
        .prepare('UPDATE figures SET updated_at = ? WHERE id = ?')
        .run(updatedAt, alias.figure_id);
      return this.aggregate({ ...figure, updated_at: updatedAt });
    });
    return remove();
  }

  private findFigure(id: EntityId): FigureRow | undefined {
    return this.database
      .prepare(
        'SELECT id, dance_id, name_cs, name_en, created_at, updated_at FROM figures WHERE id = ?',
      )
      .get(id) as FigureRow | undefined;
  }
  private aliasesForFigure(figureId: EntityId): FigureAlias[] {
    return (
      this.database
        .prepare(
          'SELECT id, figure_id, value, created_at, updated_at FROM figure_aliases WHERE figure_id = ? ORDER BY created_at, id',
        )
        .all(figureId) as FigureAliasRow[]
    ).map(mapAlias);
  }
  private aliasesByFigure(danceId: EntityId): Map<string, FigureAlias[]> {
    const result = new Map<string, FigureAlias[]>();
    for (const row of this.database
      .prepare(
        'SELECT figure_aliases.id, figure_aliases.figure_id, figure_aliases.value, figure_aliases.created_at, figure_aliases.updated_at FROM figure_aliases JOIN figures ON figures.id = figure_aliases.figure_id WHERE figures.dance_id = ? ORDER BY figure_aliases.created_at, figure_aliases.id',
      )
      .all(danceId) as FigureAliasRow[]) {
      const current = result.get(row.figure_id) ?? [];
      current.push(mapAlias(row));
      result.set(row.figure_id, current);
    }
    return result;
  }
  private aggregate(figure: FigureRow): FigureWithVariants {
    const variants = this.database
      .prepare(
        'SELECT id, figure_id, name, timing_notation, created_at, updated_at FROM figure_variants WHERE figure_id = ? ORDER BY created_at, id',
      )
      .all(figure.id) as FigureVariantRow[];
    return {
      ...mapFigure(figure),
      variants: variants.map(mapVariant),
      aliases: this.aliasesForFigure(requireEntityId(figure.id)),
    };
  }
}

function mapFigure(row: FigureRow): Omit<FigureWithVariants, 'variants' | 'aliases'> {
  return {
    id: requireEntityId(row.id),
    danceId: requireEntityId(row.dance_id),
    nameCs: row.name_cs,
    nameEn: row.name_en,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapAlias(row: FigureAliasRow): FigureAlias {
  return {
    id: requireEntityId(row.id),
    figureId: requireEntityId(row.figure_id),
    value: row.value,
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
