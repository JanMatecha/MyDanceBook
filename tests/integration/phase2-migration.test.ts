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
          `SELECT id, code, discipline, display_order
           FROM dances
           ORDER BY discipline DESC, display_order`,
        )
        .all(),
    ).toEqual([
      {
        id: '01a01352-b78a-76fd-8ba8-f6ca29c7aca6',
        code: 'WALTZ',
        discipline: 'STANDARD',
        display_order: 1,
      },
      {
        id: '01a01352-b78c-772b-a92b-8201ea95a250',
        code: 'TANGO',
        discipline: 'STANDARD',
        display_order: 2,
      },
      {
        id: '01a01352-b78c-772b-a92b-87b63bdd5c24',
        code: 'VIENNESE_WALTZ',
        discipline: 'STANDARD',
        display_order: 3,
      },
      {
        id: '01a01352-b78c-772b-a92b-889ae4043f7b',
        code: 'SLOW_FOXTROT',
        discipline: 'STANDARD',
        display_order: 4,
      },
      {
        id: '01a01352-b78c-772b-a92b-8ffa9368ba06',
        code: 'QUICKSTEP',
        discipline: 'STANDARD',
        display_order: 5,
      },
      {
        id: '01a01352-b78c-772b-a92b-93cebf4158bd',
        code: 'SAMBA',
        discipline: 'LATIN',
        display_order: 1,
      },
      {
        id: '01a01352-b78c-772b-a92b-9584e93c0385',
        code: 'CHA_CHA_CHA',
        discipline: 'LATIN',
        display_order: 2,
      },
      {
        id: '01a01352-b78c-772b-a92b-9a726aad06f5',
        code: 'RUMBA',
        discipline: 'LATIN',
        display_order: 3,
      },
      {
        id: '01a01352-b78c-772b-a92b-9db4142d90e4',
        code: 'PASO_DOBLE',
        discipline: 'LATIN',
        display_order: 4,
      },
      {
        id: '01a01352-b78c-772b-a92b-a03a5c1fe34b',
        code: 'JIVE',
        discipline: 'LATIN',
        display_order: 5,
      },
    ]);
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
