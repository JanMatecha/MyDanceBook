import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { InitializePairCommand } from '../../src/application/pair/pair-use-cases.js';
import { createVerifiedBackup } from '../../src/persistence/sqlite/backup.js';
import { openDatabase } from '../../src/persistence/sqlite/database.js';
import { runMigrations } from '../../src/persistence/sqlite/migrations.js';
import { SqlitePairRepository } from '../../src/persistence/sqlite/pair-repository.js';
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

  it('backs up and upgrades a non-empty Phase 2.1 Pair database without changing Pair or Dance identities', async () => {
    const root = await createTemporaryDirectory('phase21-to-routine');
    temporaryDirectories.push(root);
    const migrationsDirectory = join(root, 'migrations');
    const backupsDirectory = join(root, 'backups');
    await mkdir(migrationsDirectory);
    await copyMigration('0001_initialize_schema_history.sql', migrationsDirectory);
    await copyMigration('0002_pair_and_dance_catalogue.sql', migrationsDirectory);

    const database = openDatabase(join(root, 'phase21.sqlite'));
    await runMigrations({ database, migrationsDirectory });
    const pair = new InitializePairCommand(new SqlitePairRepository(database)).execute({
      leaderDisplayName: 'Jan',
      followerDisplayName: 'Eva',
    });
    await copyMigration('0003_figures_and_routines.sql', migrationsDirectory);

    let backupPath: string | undefined;
    const result = await runMigrations({
      database,
      migrationsDirectory,
      beforeRiskyMigration: async ({ version, name }) => {
        const backup = await createVerifiedBackup({
          database,
          backupDirectory: backupsDirectory,
          reason: `before-migration-${version}-${name}`,
        });
        backupPath = backup.path;
      },
    });

    expect(result.appliedVersions).toEqual([3]);
    expect(database.prepare('SELECT id FROM pairs').get()).toEqual({ id: pair.id });
    expect(
      database
        .prepare('SELECT display_name FROM pair_members WHERE pair_id = ? ORDER BY role')
        .all(pair.id),
    ).toEqual([{ display_name: 'Eva' }, { display_name: 'Jan' }]);
    expect(database.prepare('SELECT COUNT(*) AS count FROM dances').get()).toEqual({ count: 10 });
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('figures', 'figure_variants', 'routines', 'routine_figures') ORDER BY name",
        )
        .all(),
    ).toEqual([
      { name: 'figure_variants' },
      { name: 'figures' },
      { name: 'routine_figures' },
      { name: 'routines' },
    ]);
    expect(database.pragma('foreign_key_check')).toEqual([]);
    expect(database.pragma('integrity_check', { simple: true })).toBe('ok');

    expect(backupPath).toBeDefined();
    const backup = new Database(backupPath!, { readonly: true, fileMustExist: true });
    expect(backup.prepare('SELECT id FROM pairs').get()).toEqual({ id: pair.id });
    expect(backup.prepare('SELECT COUNT(*) AS count FROM dances').get()).toEqual({ count: 10 });
    expect(backup.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
      version: 2,
    });
    backup.close();
    database.close();
  });
});

async function copyMigration(fileName: string, targetDirectory: string): Promise<void> {
  const sql = await readFile(resolve('migrations', fileName), 'utf8');
  await writeFile(join(targetDirectory, fileName), sql, 'utf8');
}
