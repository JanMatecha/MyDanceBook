import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { openDatabase } from '../../src/persistence/sqlite/database.js';
import { runMigrations } from '../../src/persistence/sqlite/migrations.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('Phase 2 schema migration', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('upgrades a non-empty Phase 1 database and seeds stable dance identities once', async () => {
    const root = await createTemporaryDirectory('phase2-migration');
    temporaryDirectories.push(root);
    const migrationsDirectory = join(root, 'migrations');
    await mkdir(migrationsDirectory);
    await copyMigration('0001_initialize_schema_history.sql', migrationsDirectory);

    const database = openDatabase(join(root, 'phase1.sqlite'));
    await runMigrations({ database, migrationsDirectory });
    database.exec('CREATE TABLE legacy_fixture (id TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT');
    database.prepare('INSERT INTO legacy_fixture (id, value) VALUES (?, ?)').run('one', 'kept');

    await copyMigration('0002_pair_and_dance_catalogue.sql', migrationsDirectory);
    const result = await runMigrations({ database, migrationsDirectory });

    expect(result.appliedVersions).toEqual([2]);
    expect(database.prepare('SELECT value FROM legacy_fixture WHERE id = ?').get('one')).toEqual({
      value: 'kept',
    });
    expect(database.prepare('SELECT COUNT(*) AS count FROM dances').get()).toEqual({ count: 10 });
    expect(
      database
        .prepare(
          'SELECT discipline, COUNT(*) AS count FROM dances GROUP BY discipline ORDER BY discipline',
        )
        .all(),
    ).toEqual([
      { discipline: 'LATIN', count: 5 },
      { discipline: 'STANDARD', count: 5 },
    ]);
    await expect(runMigrations({ database, migrationsDirectory })).resolves.toMatchObject({
      appliedVersions: [],
    });
    expect(database.prepare('SELECT COUNT(*) AS count FROM dances').get()).toEqual({ count: 10 });
    expect(database.pragma('foreign_key_check')).toEqual([]);
    expect(database.pragma('integrity_check', { simple: true })).toBe('ok');
    database.close();
  });
});

async function copyMigration(fileName: string, targetDirectory: string): Promise<void> {
  const sql = await readFile(resolve('migrations', fileName), 'utf8');
  await writeFile(join(targetDirectory, fileName), sql, 'utf8');
}
