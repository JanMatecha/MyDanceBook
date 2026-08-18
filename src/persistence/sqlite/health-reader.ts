import type { DatabaseHealth, HealthStatusReader } from '../../application/health/get-health.js';

import type { SqliteDatabase } from './database.js';
import { readCurrentMigrationVersion } from './migrations.js';

export class SqliteHealthStatusReader implements HealthStatusReader {
  public constructor(private readonly database: SqliteDatabase) {}

  public readDatabaseHealth(): DatabaseHealth {
    const integrity = this.database.pragma('quick_check', { simple: true });
    if (integrity !== 'ok') {
      throw new Error(`SQLite quick_check vrátil „${String(integrity)}“.`);
    }

    return {
      status: 'ok',
      migrationVersion: readCurrentMigrationVersion(this.database),
    };
  }
}
