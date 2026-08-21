import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createEntityId } from '../../src/domain/identity.js';
import { createVerifiedBackup } from '../../src/persistence/sqlite/backup.js';
import { openDatabase } from '../../src/persistence/sqlite/database.js';
import { runMigrations } from '../../src/persistence/sqlite/migrations.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('Figure alias migration', () => {
  const temporaryDirectories: string[] = [];
  afterEach(async () => Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory)));

  it('preserves a non-empty schema-6 database while adding empty aliases', async () => {
    const root = await createTemporaryDirectory('figure-alias-migration');
    temporaryDirectories.push(root);
    const migrationsDirectory = join(root, 'migrations');
    const databaseFile = join(root, 'source.sqlite');
    const backups = join(root, 'backups');
    await mkdir(migrationsDirectory);
    for (const name of [
      '0001_initialize_schema_history.sql',
      '0002_pair_and_dance_catalogue.sql',
      '0003_figures_and_routines.sql',
      '0004_routine_sections.sql',
      '0005_figure_names_and_variant_timing.sql',
      '0006_remove_routine_figure_done.sql',
    ])
      await copyMigration(name, migrationsDirectory);
    const database = openDatabase(databaseFile);
    await runMigrations({
      database,
      migrationsDirectory,
      beforeRiskyMigration: async ({ version, name }) => {
        await createVerifiedBackup({
          database,
          backupDirectory: backups,
          reason: `before-${version}-${name}`,
        });
      },
    });
    const waltz = database.prepare("SELECT id FROM dances WHERE code = 'WALTZ'").get() as {
      id: string;
    };
    const ids = {
      cs: createEntityId(),
      en: createEntityId(),
      both: createEntityId(),
      variant: createEntityId(),
      routine: createEntityId(),
      section: createEntityId(),
      occurrence: createEntityId(),
    };
    const createdAt = '2026-08-20T10:00:00.000Z';
    const updatedAt = '2026-08-20T11:00:00.000Z';
    const insertFigure = database.prepare(
      'INSERT INTO figures (id, dance_id, name_cs, name_en, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    insertFigure.run(ids.cs, waltz.id, 'Česká', null, createdAt, updatedAt);
    insertFigure.run(ids.en, waltz.id, null, 'English', createdAt, updatedAt);
    insertFigure.run(ids.both, waltz.id, 'Dvojjazyčná', 'Bilingual', createdAt, updatedAt);
    database
      .prepare(
        'INSERT INTO figure_variants (id, figure_id, name, timing_notation, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(ids.variant, ids.both, 'Výchozí varianta', '1 – 2 & 3', createdAt, updatedAt);
    database
      .prepare(
        'INSERT INTO routines (id, dance_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(ids.routine, waltz.id, 'Sestava', createdAt, updatedAt);
    database
      .prepare(
        'INSERT INTO routine_sections (id, routine_id, name, position, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
      )
      .run(ids.section, ids.routine, 'Část 1', createdAt, updatedAt);
    database
      .prepare(
        'INSERT INTO routine_figures (id, section_id, position, figure_id, figure_variant_id, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?, ?)',
      )
      .run(ids.occurrence, ids.section, ids.both, ids.variant, createdAt, updatedAt);
    await copyMigration('0007_figure_aliases.sql', migrationsDirectory);
    const result = await runMigrations({
      database,
      migrationsDirectory,
      beforeRiskyMigration: async ({ version, name }) => {
        await createVerifiedBackup({
          database,
          backupDirectory: backups,
          reason: `before-${version}-${name}`,
        });
      },
    });
    expect(result.appliedVersions).toEqual([7]);
    expect(database.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual(
      { version: 7 },
    );
    expect(
      database
        .prepare('SELECT id, name_cs, name_en, created_at, updated_at FROM figures ORDER BY id')
        .all(),
    ).toEqual(
      expect.arrayContaining([
        {
          id: ids.cs,
          name_cs: 'Česká',
          name_en: null,
          created_at: createdAt,
          updated_at: updatedAt,
        },
        {
          id: ids.en,
          name_cs: null,
          name_en: 'English',
          created_at: createdAt,
          updated_at: updatedAt,
        },
        {
          id: ids.both,
          name_cs: 'Dvojjazyčná',
          name_en: 'Bilingual',
          created_at: createdAt,
          updated_at: updatedAt,
        },
      ]),
    );
    expect(
      database
        .prepare('SELECT id, figure_id, timing_notation FROM figure_variants WHERE id = ?')
        .get(ids.variant),
    ).toEqual({ id: ids.variant, figure_id: ids.both, timing_notation: '1 – 2 & 3' });
    expect(
      database
        .prepare(
          'SELECT id, section_id, figure_id, figure_variant_id FROM routine_figures WHERE id = ?',
        )
        .get(ids.occurrence),
    ).toEqual({
      id: ids.occurrence,
      section_id: ids.section,
      figure_id: ids.both,
      figure_variant_id: ids.variant,
    });
    expect(database.prepare('SELECT * FROM figure_aliases').all()).toEqual([]);
    expect(
      (
        database.prepare("PRAGMA table_info('routine_figures')").all() as Array<{ name: string }>
      ).map((column) => column.name),
    ).not.toContain('done');
    expect(database.pragma('foreign_key_check')).toEqual([]);
    expect(database.pragma('integrity_check', { simple: true })).toBe('ok');
    database.close();
    const reopened = openDatabase(databaseFile);
    expect(reopened.pragma('integrity_check', { simple: true })).toBe('ok');
    reopened.close();
  });
});
async function copyMigration(name: string, directory: string) {
  await writeFile(
    join(directory, name),
    await readFile(resolve('migrations', name), 'utf8'),
    'utf8',
  );
}
