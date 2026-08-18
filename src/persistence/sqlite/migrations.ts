import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { SqliteDatabase } from './database.js';

const migrationFilePattern = /^(\d{4})_([a-z0-9][a-z0-9_-]*)\.sql$/;
const backupDirectivePattern = /^--\s*mydancebook:requires-backup=(true|false)\s*$/m;

interface MigrationDescriptor {
  readonly version: number;
  readonly name: string;
  readonly fileName: string;
  readonly sql: string;
  readonly checksum: string;
  readonly requiresBackup: boolean;
}

interface AppliedMigrationRow {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
}

export interface PendingMigration {
  readonly version: number;
  readonly name: string;
}

export interface MigrationOptions {
  readonly database: SqliteDatabase;
  readonly migrationsDirectory: string;
  readonly beforeRiskyMigration?: (migration: PendingMigration) => Promise<void>;
  readonly now?: () => Date;
}

export interface MigrationResult {
  readonly currentVersion: number;
  readonly appliedVersions: readonly number[];
}

export class MigrationError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'MigrationError';
  }
}

export async function runMigrations(options: MigrationOptions): Promise<MigrationResult> {
  const migrations = await loadMigrations(options.migrationsDirectory);
  ensureMigrationHistory(options.database);

  const appliedRows = options.database
    .prepare('SELECT version, name, checksum FROM schema_migrations ORDER BY version')
    .all() as AppliedMigrationRow[];
  const migrationByVersion = new Map(migrations.map((migration) => [migration.version, migration]));

  for (const row of appliedRows) {
    const source = migrationByVersion.get(row.version);
    if (!source) {
      throw new MigrationError(
        `Databáze obsahuje migraci ${row.version}, jejíž zdrojový soubor chybí.`,
      );
    }
    if (source.name !== row.name || source.checksum !== row.checksum) {
      throw new MigrationError(`Již použitá migrace ${row.version} byla změněna.`);
    }
  }

  const appliedVersions = new Set(appliedRows.map((row) => row.version));
  const newlyApplied: number[] = [];
  const now = options.now ?? (() => new Date());

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;

    if (migration.requiresBackup) {
      if (!options.beforeRiskyMigration) {
        throw new MigrationError(
          `Migrace ${migration.version} vyžaduje ověřenou zálohu, ale bezpečnostní hook není nastaven.`,
        );
      }
      await options.beforeRiskyMigration({ version: migration.version, name: migration.name });
    }

    const apply = options.database.transaction(() => {
      options.database.exec(migration.sql);
      options.database
        .prepare(
          'INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)',
        )
        .run(migration.version, migration.name, migration.checksum, now().toISOString());
    });

    try {
      apply();
      newlyApplied.push(migration.version);
    } catch (cause: unknown) {
      throw new MigrationError(
        `Migrace ${migration.version} (${migration.fileName}) selhala a byla vrácena zpět.`,
        cause,
      );
    }
  }

  return {
    currentVersion: migrations.at(-1)?.version ?? 0,
    appliedVersions: newlyApplied,
  };
}

export function readCurrentMigrationVersion(database: SqliteDatabase): number {
  const row = database.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
    version: number | null;
  };
  return row.version ?? 0;
}

function ensureMigrationHistory(database: SqliteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT
  `);
}

async function loadMigrations(directory: string): Promise<MigrationDescriptor[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (cause: unknown) {
    throw new MigrationError(`Adresář migrací „${directory}“ nelze načíst.`, cause);
  }

  const migrations: MigrationDescriptor[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = migrationFilePattern.exec(entry.name);
    if (!match) continue;

    const version = Number(match[1]);
    const name = match[2];
    if (!Number.isSafeInteger(version) || name === undefined) {
      throw new MigrationError(`Neplatný název migrace „${entry.name}“.`);
    }

    const sql = await readFile(join(directory, entry.name), 'utf8');
    const directive = backupDirectivePattern.exec(sql)?.[1];
    if (!directive) {
      throw new MigrationError(
        `Migrace ${entry.name} musí deklarovat mydancebook:requires-backup=true|false.`,
      );
    }

    migrations.push({
      version,
      name,
      fileName: entry.name,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
      requiresBackup: directive === 'true',
    });
  }

  migrations.sort((left, right) => left.version - right.version);
  for (let index = 1; index < migrations.length; index += 1) {
    if (migrations[index]?.version === migrations[index - 1]?.version) {
      throw new MigrationError(`Duplicitní číslo migrace ${migrations[index]?.version}.`);
    }
  }

  if (migrations.length === 0) {
    throw new MigrationError(`V adresáři „${directory}“ nejsou žádné migrace.`);
  }

  return migrations;
}
