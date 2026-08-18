import type { HealthStatusReader } from '../application/health/get-health.js';

import { ensureDataDirectories, type DataPaths } from './data-directories.js';
import { createVerifiedBackup } from './sqlite/backup.js';
import { openDatabase, type SqliteDatabase } from './sqlite/database.js';
import { SqliteHealthStatusReader } from './sqlite/health-reader.js';
import { runMigrations } from './sqlite/migrations.js';

export interface PersistenceOptions {
  readonly paths: DataPaths;
  readonly migrationsDirectory: string;
}

export interface PersistenceContext {
  readonly database: SqliteDatabase;
  readonly healthStatusReader: HealthStatusReader;
  close(): void;
}

export async function initializePersistence(
  options: PersistenceOptions,
): Promise<PersistenceContext> {
  await ensureDataDirectories(options.paths);
  const database = openDatabase(options.paths.databaseFile);

  try {
    await runMigrations({
      database,
      migrationsDirectory: options.migrationsDirectory,
      beforeRiskyMigration: async (migration) => {
        await createVerifiedBackup({
          database,
          backupDirectory: options.paths.backupsDirectory,
          reason: `before-migration-${migration.version}-${migration.name}`,
        });
      },
    });

    return {
      database,
      healthStatusReader: new SqliteHealthStatusReader(database),
      close: () => database.close(),
    };
  } catch (cause: unknown) {
    database.close();
    throw cause;
  }
}
