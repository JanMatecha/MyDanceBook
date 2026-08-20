import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { createEntityId, parseEntityId } from '../../src/domain/identity.js';
import { createVerifiedBackup } from '../../src/persistence/sqlite/backup.js';
import { openDatabase } from '../../src/persistence/sqlite/database.js';
import { runMigrations } from '../../src/persistence/sqlite/migrations.js';
import { SqliteRoutineRepository } from '../../src/persistence/sqlite/routine-repository.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('RoutineSection hierarchy migration', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('backs up and transforms a non-empty migration-0003 database without changing occurrence IDs or data', async () => {
    const root = await createTemporaryDirectory('routine-section-migration');
    temporaryDirectories.push(root);
    const migrationsDirectory = join(root, 'migrations');
    const backupsDirectory = join(root, 'backups');
    const databaseFile = join(root, 'migration-0003.sqlite');
    await mkdir(migrationsDirectory);
    for (const fileName of [
      '0001_initialize_schema_history.sql',
      '0002_pair_and_dance_catalogue.sql',
      '0003_figures_and_routines.sql',
    ]) {
      await copyMigration(fileName, migrationsDirectory);
    }

    const database = openDatabase(databaseFile);
    await runMigrations({
      database,
      migrationsDirectory,
      beforeRiskyMigration: async ({ version, name }) => {
        await createVerifiedBackup({
          database,
          backupDirectory: backupsDirectory,
          reason: `fixture-before-migration-${version}-${name}`,
        });
      },
    });
    expect(database.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual(
      { version: 3 },
    );

    const waltz = database.prepare("SELECT id FROM dances WHERE code = 'WALTZ'").get() as {
      id: string;
    };
    const tango = database.prepare("SELECT id FROM dances WHERE code = 'TANGO'").get() as {
      id: string;
    };
    const ids = {
      waltzFigure: createEntityId(),
      waltzVariant: createEntityId(),
      tangoFigure: createEntityId(),
      tangoVariant: createEntityId(),
      waltzRoutine: createEntityId(),
      tangoRoutine: createEntityId(),
      waltzFirst: createEntityId(),
      waltzSecond: createEntityId(),
      waltzThird: createEntityId(),
      tangoFirst: createEntityId(),
      tangoSecond: createEntityId(),
    };
    const createdAt = '2026-08-18T18:00:00.000Z';
    const updatedAt = '2026-08-19T07:30:00.000Z';
    const insertFigure = database.prepare(
      `INSERT INTO figures (id, dance_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const insertVariant = database.prepare(
      `INSERT INTO figure_variants (id, figure_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    insertFigure.run(ids.waltzFigure, waltz.id, 'Zášvih', createdAt, updatedAt);
    insertVariant.run(ids.waltzVariant, ids.waltzFigure, 'Výchozí varianta', createdAt, updatedAt);
    insertFigure.run(ids.tangoFigure, tango.id, 'Chůze', createdAt, updatedAt);
    insertVariant.run(ids.tangoVariant, ids.tangoFigure, 'Výchozí varianta', createdAt, updatedAt);
    const insertRoutine = database.prepare(
      `INSERT INTO routines (id, dance_id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    insertRoutine.run(ids.waltzRoutine, waltz.id, 'Waltz E', createdAt, updatedAt);
    insertRoutine.run(ids.tangoRoutine, tango.id, 'Tango A', createdAt, updatedAt);
    const insertOccurrence = database.prepare(
      `INSERT INTO routine_figures
         (id, routine_id, position, figure_id, figure_variant_id, done, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertOccurrence.run(
      ids.waltzFirst,
      ids.waltzRoutine,
      1,
      ids.waltzFigure,
      null,
      0,
      createdAt,
      createdAt,
    );
    insertOccurrence.run(
      ids.waltzSecond,
      ids.waltzRoutine,
      2,
      ids.waltzFigure,
      ids.waltzVariant,
      1,
      createdAt,
      updatedAt,
    );
    insertOccurrence.run(ids.waltzThird, ids.waltzRoutine, 3, null, null, 0, updatedAt, updatedAt);
    insertOccurrence.run(
      ids.tangoFirst,
      ids.tangoRoutine,
      1,
      ids.tangoFigure,
      ids.tangoVariant,
      1,
      createdAt,
      updatedAt,
    );
    insertOccurrence.run(ids.tangoSecond, ids.tangoRoutine, 2, null, null, 0, createdAt, createdAt);

    await copyMigration('0004_routine_sections.sql', migrationsDirectory);
    await copyMigration('0005_figure_names_and_variant_timing.sql', migrationsDirectory);
    let backupPath: string | undefined;
    let backupCalls = 0;
    const result = await runMigrations({
      database,
      migrationsDirectory,
      beforeRiskyMigration: async ({ version, name }) => {
        backupCalls += 1;
        const backup = await createVerifiedBackup({
          database,
          backupDirectory: backupsDirectory,
          reason: `before-migration-${version}-${name}`,
        });
        backupPath = backup.path;
      },
    });

    expect(result.appliedVersions).toEqual([4, 5]);
    expect(backupCalls).toBe(2);
    expect(
      database
        .prepare(
          `SELECT routine_id, name, position, created_at, updated_at
           FROM routine_sections ORDER BY routine_id`,
        )
        .all(),
    ).toEqual(
      [
        {
          routine_id: ids.waltzRoutine,
          name: 'Část 1',
          position: 1,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        {
          routine_id: ids.tangoRoutine,
          name: 'Část 1',
          position: 1,
          created_at: createdAt,
          updated_at: updatedAt,
        },
      ].sort((left, right) => left.routine_id.localeCompare(right.routine_id)),
    );
    const sectionRows = database
      .prepare('SELECT id, routine_id FROM routine_sections ORDER BY routine_id')
      .all() as Array<{ id: string; routine_id: string }>;
    expect(sectionRows.every((row) => parseEntityId(row.id) !== null)).toBe(true);

    const migratedOccurrences = database
      .prepare(
        `SELECT routine_figures.id, routine_sections.routine_id, routine_figures.position,
                routine_figures.figure_id, routine_figures.figure_variant_id, routine_figures.done,
                routine_figures.created_at, routine_figures.updated_at
         FROM routine_figures
         JOIN routine_sections ON routine_sections.id = routine_figures.section_id
         ORDER BY routine_sections.routine_id, routine_figures.position`,
      )
      .all();
    expect(migratedOccurrences).toEqual(
      expect.arrayContaining([
        {
          id: ids.waltzFirst,
          routine_id: ids.waltzRoutine,
          position: 1,
          figure_id: ids.waltzFigure,
          figure_variant_id: null,
          done: 0,
          created_at: createdAt,
          updated_at: createdAt,
        },
        {
          id: ids.waltzSecond,
          routine_id: ids.waltzRoutine,
          position: 2,
          figure_id: ids.waltzFigure,
          figure_variant_id: ids.waltzVariant,
          done: 1,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        expect.objectContaining({
          id: ids.waltzThird,
          routine_id: ids.waltzRoutine,
          position: 3,
          figure_id: null,
          figure_variant_id: null,
          done: 0,
        }),
        expect.objectContaining({
          id: ids.tangoFirst,
          routine_id: ids.tangoRoutine,
          position: 1,
          figure_id: ids.tangoFigure,
          figure_variant_id: ids.tangoVariant,
          done: 1,
        }),
        expect.objectContaining({
          id: ids.tangoSecond,
          routine_id: ids.tangoRoutine,
          position: 2,
          figure_id: null,
          figure_variant_id: null,
          done: 0,
        }),
      ]),
    );
    expect(
      (
        database.prepare("PRAGMA table_info('routine_figures')").all() as Array<{ name: string }>
      ).map((column) => column.name),
    ).toEqual([
      'id',
      'section_id',
      'position',
      'figure_id',
      'figure_variant_id',
      'done',
      'created_at',
      'updated_at',
    ]);
    expect(database.pragma('foreign_key_check')).toEqual([]);
    expect(database.pragma('integrity_check', { simple: true })).toBe('ok');

    expect(backupPath).toBeDefined();
    const backup = new Database(backupPath!, { readonly: true, fileMustExist: true });
    expect(backup.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
      version: 4,
    });
    expect(backup.prepare('SELECT id FROM routine_figures').all()).toHaveLength(5);
    backup.close();

    database.close();
    const reopened = openDatabase(databaseFile);
    await expect(runMigrations({ database: reopened, migrationsDirectory })).resolves.toMatchObject(
      {
        appliedVersions: [],
      },
    );
    const waltzRoutine = new SqliteRoutineRepository(reopened).listByDance(
      parseEntityId(waltz.id)!,
    )[0];
    expect(waltzRoutine?.sections).toEqual([
      expect.objectContaining({
        name: 'Část 1',
        position: 1,
        routineFigures: [
          expect.objectContaining({ id: ids.waltzFirst, position: 1 }),
          expect.objectContaining({ id: ids.waltzSecond, position: 2 }),
          expect.objectContaining({ id: ids.waltzThird, position: 3 }),
        ],
      }),
    ]);
    expect(() =>
      reopened.prepare('DELETE FROM routine_sections WHERE routine_id = ?').run(ids.waltzRoutine),
    ).toThrow('Routine must retain at least one RoutineSection');
    expect(reopened.pragma('foreign_key_check')).toEqual([]);
    reopened.close();
  });
});

async function copyMigration(fileName: string, targetDirectory: string): Promise<void> {
  const sql = await readFile(resolve('migrations', fileName), 'utf8');
  await writeFile(join(targetDirectory, fileName), sql, 'utf8');
}
