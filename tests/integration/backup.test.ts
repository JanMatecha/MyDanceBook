import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { BackupError, createVerifiedBackup } from '../../src/persistence/sqlite/backup.js';
import { openDatabase } from '../../src/persistence/sqlite/database.js';
import { runMigrations } from '../../src/persistence/sqlite/migrations.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('verified SQLite backup', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('publishes an independently readable backup with records and migration metadata', async () => {
    const root = await createTemporaryDirectory('backup-success');
    temporaryDirectories.push(root);
    const database = openDatabase(join(root, 'source.sqlite'));
    await migrateForBackupTest(database, root);
    database.exec('CREATE TABLE backup_fixture (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT');
    database
      .prepare('INSERT INTO backup_fixture (id, value) VALUES (?, ?)')
      .run('fixture-1', 'kept');

    const result = await createVerifiedBackup({
      database,
      backupDirectory: join(root, 'backups'),
      reason: 'integration-test',
    });

    expect(result.migrationVersion).toBe(5);
    const backup = new Database(result.path, { readonly: true, fileMustExist: true });
    expect(
      backup.prepare('SELECT value FROM backup_fixture WHERE id = ?').get('fixture-1'),
    ).toEqual({
      value: 'kept',
    });
    expect(backup.pragma('integrity_check', { simple: true })).toBe('ok');
    backup.close();
    expect(
      (await readdir(join(root, 'backups'))).some((name) => name.endsWith('.incomplete')),
    ).toBe(false);
    database.close();
  });

  it('does not publish a successful file when the live connection is unusable', async () => {
    const root = await createTemporaryDirectory('backup-failure');
    temporaryDirectories.push(root);
    const backupDirectory = join(root, 'backups');
    const database = openDatabase(join(root, 'source.sqlite'));
    await migrateForBackupTest(database, root);
    database.close();

    await expect(
      createVerifiedBackup({ database, backupDirectory, reason: 'closed-source' }),
    ).rejects.toBeInstanceOf(BackupError);
    expect(await readdir(backupDirectory)).toEqual([]);
  });
});

async function migrateForBackupTest(database: ReturnType<typeof openDatabase>, root: string) {
  return runMigrations({
    database,
    migrationsDirectory: resolve('migrations'),
    beforeRiskyMigration: async ({ version, name }) => {
      await createVerifiedBackup({
        database,
        backupDirectory: join(root, 'pre-migration-backups'),
        reason: `before-migration-${version}-${name}`,
      });
    },
  });
}
