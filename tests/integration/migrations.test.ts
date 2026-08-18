import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { createVerifiedBackup } from '../../src/persistence/sqlite/backup.js';
import { openDatabase } from '../../src/persistence/sqlite/database.js';
import { runMigrations } from '../../src/persistence/sqlite/migrations.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('versioned migrations', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('backs up a non-empty older database and preserves data, constraints and history', async () => {
    const root = await createTemporaryDirectory('migration');
    temporaryDirectories.push(root);
    const migrationsDirectory = join(root, 'migrations');
    const backupsDirectory = join(root, 'backups');
    await mkdir(migrationsDirectory);
    await writeFile(
      join(migrationsDirectory, '0001_create_fixture.sql'),
      `-- mydancebook:requires-backup=false
       CREATE TABLE parents (id TEXT PRIMARY KEY) STRICT;
       CREATE TABLE fixture_records (
         id TEXT PRIMARY KEY,
         parent_id TEXT NOT NULL REFERENCES parents(id),
         value TEXT NOT NULL
       ) STRICT;`,
      'utf8',
    );

    const database = openDatabase(join(root, 'fixture.sqlite'));
    await runMigrations({ database, migrationsDirectory });
    database.prepare('INSERT INTO parents (id) VALUES (?)').run('parent-1');
    database
      .prepare('INSERT INTO fixture_records (id, parent_id, value) VALUES (?, ?, ?)')
      .run('record-1', 'parent-1', 'preserve-me');

    await writeFile(
      join(migrationsDirectory, '0002_add_detail.sql'),
      `-- mydancebook:requires-backup=true
       ALTER TABLE fixture_records ADD COLUMN detail TEXT NOT NULL DEFAULT 'unchanged';`,
      'utf8',
    );

    let backupPath: string | undefined;
    let hookCalls = 0;
    const migrate = () =>
      runMigrations({
        database,
        migrationsDirectory,
        beforeRiskyMigration: async ({ version }) => {
          hookCalls += 1;
          const backup = await createVerifiedBackup({
            database,
            backupDirectory: backupsDirectory,
            reason: `before-migration-${version}`,
          });
          backupPath = backup.path;
        },
      });

    const result = await migrate();
    expect(result.appliedVersions).toEqual([2]);
    expect(hookCalls).toBe(1);
    expect(
      database.prepare('SELECT value, detail FROM fixture_records WHERE id = ?').get('record-1'),
    ).toEqual({ value: 'preserve-me', detail: 'unchanged' });
    expect(() =>
      database
        .prepare('INSERT INTO fixture_records (id, parent_id, value) VALUES (?, ?, ?)')
        .run('broken', 'missing-parent', 'invalid'),
    ).toThrow();
    expect(database.pragma('integrity_check', { simple: true })).toBe('ok');

    await expect(migrate()).resolves.toMatchObject({ appliedVersions: [] });
    expect(hookCalls).toBe(1);
    expect(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({
      count: 2,
    });

    expect(backupPath).toBeDefined();
    const backup = new Database(backupPath!, { readonly: true, fileMustExist: true });
    expect(
      backup.prepare('SELECT value FROM fixture_records WHERE id = ?').get('record-1'),
    ).toEqual({ value: 'preserve-me' });
    expect(backup.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
      version: 1,
    });
    backup.close();
    database.close();
  });
});
