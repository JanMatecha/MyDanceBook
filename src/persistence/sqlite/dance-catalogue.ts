import type { DanceCatalogue } from '../../application/app-state/get-app-state.js';
import type { Dance, DanceCode, DanceDiscipline } from '../../domain/dance.js';
import { parseEntityId } from '../../domain/identity.js';
import type { SqliteDatabase } from './database.js';

interface DanceRow {
  readonly id: string;
  readonly code: DanceCode;
  readonly internal_name: string;
  readonly discipline: DanceDiscipline;
  readonly display_order: number;
}

export class SqliteDanceCatalogue implements DanceCatalogue {
  public constructor(private readonly database: SqliteDatabase) {}

  public list(): readonly Dance[] {
    const rows = this.database
      .prepare(
        `SELECT id, code, internal_name, discipline, display_order
         FROM dances
         ORDER BY CASE discipline WHEN 'STANDARD' THEN 0 ELSE 1 END, display_order`,
      )
      .all() as DanceRow[];

    return rows.map((row) => {
      const id = parseEntityId(row.id);
      if (!id) throw new Error(`Tanec ${row.code} nemá platné UUIDv7.`);
      return {
        id,
        code: row.code,
        internalName: row.internal_name,
        discipline: row.discipline,
        order: row.display_order,
      };
    });
  }
}
