import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  CreateFigureCommand,
  RenameFigureCommand,
} from '../../src/application/figure/figure-use-cases.js';
import {
  AddRoutineFigurePlaceholderCommand,
  AssignRoutineFigureCommand,
  CreateFigureForRoutineFigureCommand,
  CreateRoutineCommand,
  MoveRoutineFigureCommand,
  SetRoutineFigureDoneCommand,
} from '../../src/application/routine/routine-use-cases.js';
import { createEntityId } from '../../src/domain/identity.js';
import { resolveDataPaths } from '../../src/persistence/data-directories.js';
import { initializePersistence } from '../../src/persistence/initialize.js';
import { SqliteDanceCatalogue } from '../../src/persistence/sqlite/dance-catalogue.js';
import { SqliteFigureRepository } from '../../src/persistence/sqlite/figure-repository.js';
import { SqliteRoutineRepository } from '../../src/persistence/sqlite/routine-repository.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('SQLite Figure and Routine repositories', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('persists a routine with central references, placeholders, stable occurrence IDs, order and Done after reopen', async () => {
    const root = await createTemporaryDirectory('routine-repository');
    temporaryDirectories.push(root);
    const paths = resolveDataPaths(root);
    const persistence = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const dances = new SqliteDanceCatalogue(persistence.database);
    const waltz = dances.list().find((dance) => dance.code === 'WALTZ');
    const tango = dances.list().find((dance) => dance.code === 'TANGO');
    expect(waltz).toBeDefined();
    expect(tango).toBeDefined();
    if (!waltz || !tango) throw new Error('Testovací tanec nebyl nalezen.');

    const figures = new SqliteFigureRepository(persistence.database);
    const routines = new SqliteRoutineRepository(persistence.database);
    const naturalTurn = new CreateFigureCommand(figures).execute({
      danceId: waltz.id,
      name: 'Natural Turn',
    });
    expect(naturalTurn.variants).toHaveLength(1);
    expect(naturalTurn.variants[0]?.name).toBe('Výchozí varianta');

    const routine = new CreateRoutineCommand(routines).execute({
      danceId: waltz.id,
      name: 'Waltz – naše sestava',
    });
    const addPlaceholder = new AddRoutineFigurePlaceholderCommand(routines);
    const first = addPlaceholder.execute(routine.id);
    const second = addPlaceholder.execute(routine.id);
    const third = addPlaceholder.execute(routine.id);
    expect(first && second && third).not.toBeNull();
    if (!first || !second || !third) throw new Error('Testovací výskyty nebyly vytvořeny.');

    const tangoFigure = new CreateFigureCommand(figures).execute({
      danceId: tango.id,
      name: 'Progressive Link',
    });
    expect(
      new AssignRoutineFigureCommand(routines).execute(
        third.id,
        tangoFigure.id,
        tangoFigure.variants[0]?.id ?? null,
      ),
    ).toBe('invalid_assignment');
    expect(() =>
      persistence.database
        .prepare(
          `UPDATE routine_figures
           SET figure_id = ?, figure_variant_id = ?
           WHERE id = ?`,
        )
        .run(tangoFigure.id, tangoFigure.variants[0]?.id, third.id),
    ).toThrow('RoutineFigure Figure must belong to routine Dance');

    expect(
      new AssignRoutineFigureCommand(routines).execute(
        first.id,
        naturalTurn.id,
        naturalTurn.variants[0]?.id ?? null,
      ),
    ).toBe('updated');
    expect(
      new CreateFigureForRoutineFigureCommand(routines).execute(second.id, 'Reverse Turn'),
    ).toBe('updated');
    expect(new MoveRoutineFigureCommand(routines).execute(third.id, first.id)).toBe('moved');
    expect(new SetRoutineFigureDoneCommand(routines).execute(first.id, true)?.done).toBe(true);

    const beforeRestart = routines.listByDance(waltz.id)[0];
    expect(beforeRestart?.routineFigures.map((item) => item.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
    expect(beforeRestart?.routineFigures.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(beforeRestart?.routineFigures[0]).toMatchObject({
      figureId: null,
      figureVariantId: null,
    });
    expect(beforeRestart?.routineFigures[1]).toMatchObject({
      id: first.id,
      figureId: naturalTurn.id,
      figureVariantId: naturalTurn.variants[0]?.id,
      done: true,
    });
    expect(beforeRestart?.routineFigures[2]).toMatchObject({
      id: second.id,
      figureName: 'Reverse Turn',
      figureVariantName: 'Výchozí varianta',
      done: false,
    });
    expect(figures.listByDance(waltz.id)).toHaveLength(2);

    persistence.close();
    const reopened = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const reloaded = new SqliteRoutineRepository(reopened.database).listByDance(waltz.id)[0];
    expect(reloaded).toEqual(beforeRestart);
    expect(reopened.database.pragma('foreign_key_check')).toEqual([]);
    expect(reopened.database.pragma('integrity_check', { simple: true })).toBe('ok');
    reopened.close();
  });

  it('rolls back Figure creation when its automatic first variant cannot be inserted', async () => {
    const root = await createTemporaryDirectory('figure-transaction');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const waltz = new SqliteDanceCatalogue(persistence.database)
      .list()
      .find((dance) => dance.code === 'WALTZ');
    if (!waltz) throw new Error('Testovací Waltz nebyl nalezen.');
    const figures = new SqliteFigureRepository(persistence.database);
    const existing = new CreateFigureCommand(figures).execute({
      danceId: waltz.id,
      name: 'Natural Turn',
    });

    expect(() =>
      figures.create({
        id: createEntityId(),
        danceId: waltz.id,
        name: 'Neuložená figura',
        firstVariantId: existing.variants[0]?.id ?? createEntityId(),
        firstVariantName: 'Výchozí varianta',
        createdAt: '2026-08-19T08:00:00.000Z',
      }),
    ).toThrow();
    expect(figures.listByDance(waltz.id).map((figure) => figure.name)).toEqual(['Natural Turn']);
    persistence.close();
  });

  it('renames a central Figure without changing its variants or RoutineFigure references after reopen', async () => {
    const root = await createTemporaryDirectory('figure-rename-repository');
    temporaryDirectories.push(root);
    const paths = resolveDataPaths(root);
    const persistence = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const waltz = new SqliteDanceCatalogue(persistence.database)
      .list()
      .find((dance) => dance.code === 'WALTZ');
    if (!waltz) throw new Error('Testovací Waltz nebyl nalezen.');

    const figures = new SqliteFigureRepository(persistence.database);
    const routines = new SqliteRoutineRepository(persistence.database);
    const figure = new CreateFigureCommand(figures).execute({
      danceId: waltz.id,
      name: 'Otočka v pravo',
    });
    const routine = new CreateRoutineCommand(routines).execute({
      danceId: waltz.id,
      name: 'Trénink',
    });
    const first = new AddRoutineFigurePlaceholderCommand(routines).execute(routine.id);
    const second = new AddRoutineFigurePlaceholderCommand(routines).execute(routine.id);
    if (!first || !second) throw new Error('Testovací výskyty nebyly vytvořeny.');
    const variantId = figure.variants[0]?.id;
    if (!variantId) throw new Error('Výchozí varianta nebyla vytvořena.');
    const assign = new AssignRoutineFigureCommand(routines);
    expect(assign.execute(first.id, figure.id, variantId)).toBe('updated');
    expect(assign.execute(second.id, figure.id, variantId)).toBe('updated');

    const renamed = new RenameFigureCommand(
      figures,
      () => new Date('2026-08-19T10:00:00.000Z'),
    ).execute(figure.id, 'Otočka vpravo');
    expect(renamed).toMatchObject({
      id: figure.id,
      name: 'Otočka vpravo',
      variants: [{ id: variantId, figureId: figure.id }],
    });
    expect(routines.listByDance(waltz.id)[0]?.routineFigures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, figureId: figure.id, figureName: 'Otočka vpravo' }),
        expect.objectContaining({
          id: second.id,
          figureId: figure.id,
          figureName: 'Otočka vpravo',
        }),
      ]),
    );

    persistence.close();
    const reopened = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const reopenedFigures = new SqliteFigureRepository(reopened.database).listByDance(waltz.id);
    const reopenedRoutine = new SqliteRoutineRepository(reopened.database).listByDance(waltz.id)[0];
    expect(reopenedFigures).toEqual([
      expect.objectContaining({
        id: figure.id,
        name: 'Otočka vpravo',
        variants: [expect.objectContaining({ id: variantId, figureId: figure.id })],
      }),
    ]);
    expect(reopenedRoutine?.routineFigures.map((item) => item.figureName)).toEqual([
      'Otočka vpravo',
      'Otočka vpravo',
    ]);
    reopened.close();
  });
});
