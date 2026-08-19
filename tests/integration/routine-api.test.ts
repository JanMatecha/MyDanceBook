import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { GetAppStateQuery } from '../../src/application/app-state/get-app-state.js';
import { CreateFigureCommand } from '../../src/application/figure/figure-use-cases.js';
import { GetHealthQuery } from '../../src/application/health/get-health.js';
import {
  InitializePairCommand,
  UpdatePairNamesCommand,
} from '../../src/application/pair/pair-use-cases.js';
import { GetDanceNotebookQuery } from '../../src/application/routine/get-dance-notebook.js';
import {
  AddRoutineFigurePlaceholderCommand,
  AssignRoutineFigureCommand,
  CreateFigureForRoutineFigureCommand,
  CreateRoutineCommand,
  MoveRoutineFigureCommand,
  SetRoutineFigureDoneCommand,
} from '../../src/application/routine/routine-use-cases.js';
import { resolveDataPaths } from '../../src/persistence/data-directories.js';
import {
  initializePersistence,
  type PersistenceContext,
} from '../../src/persistence/initialize.js';
import { SqliteDanceCatalogue } from '../../src/persistence/sqlite/dance-catalogue.js';
import { SqliteFigureRepository } from '../../src/persistence/sqlite/figure-repository.js';
import { SqlitePairRepository } from '../../src/persistence/sqlite/pair-repository.js';
import { SqliteRoutineRepository } from '../../src/persistence/sqlite/routine-repository.js';
import { buildServer } from '../../src/server/app.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('Routine notebook API', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('captures and reopens the Waltz pilot flow without seeding user figures or routines', async () => {
    const root = await createTemporaryDirectory('routine-api');
    temporaryDirectories.push(root);
    const paths = resolveDataPaths(root);
    const persistence = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const app = await buildNotebookServer(persistence);

    const onboarding = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: { leaderDisplayName: 'Jan', followerDisplayName: 'Eva' },
    });
    expect(onboarding.statusCode).toBe(201);

    const appState = await app.inject({ method: 'GET', url: '/api/app-state' });
    const waltz = appState.json().dances.find((dance: { code: string }) => dance.code === 'WALTZ');
    expect(waltz).toBeDefined();

    const createdFigure = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { name: 'Natural Turn' },
    });
    expect(createdFigure.statusCode).toBe(201);
    const naturalTurn = createdFigure.json();
    expect(naturalTurn).toMatchObject({ name: 'Natural Turn' });
    expect(naturalTurn.variants).toHaveLength(1);

    const createdRoutine = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/routines`,
      payload: { name: 'Waltz – naše sestava' },
    });
    expect(createdRoutine.statusCode).toBe(201);
    const routine = createdRoutine.json();

    const placeholders = await Promise.all(
      [1, 2, 3].map(() =>
        app.inject({ method: 'POST', url: `/api/routines/${routine.id}/routine-figures` }),
      ),
    );
    expect(placeholders.map((result) => result.statusCode)).toEqual([201, 201, 201]);
    const [first, second, third] = placeholders.map((result) => result.json());

    const assignExisting = await app.inject({
      method: 'PUT',
      url: `/api/routine-figures/${first.id}/assignment`,
      payload: { figureId: naturalTurn.id, figureVariantId: naturalTurn.variants[0].id },
    });
    expect(assignExisting.statusCode).toBe(200);
    const inlineFigure = await app.inject({
      method: 'POST',
      url: `/api/routine-figures/${second.id}/figure`,
      payload: { name: 'Reverse Turn' },
    });
    expect(inlineFigure.statusCode).toBe(201);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/routine-figures/${second.id}/move`,
          payload: { beforeRoutineFigureId: first.id },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/routine-figures/${first.id}/done`,
          payload: { done: true },
        })
      ).statusCode,
    ).toBe(200);

    const captured = await app.inject({ method: 'GET', url: `/api/dances/${waltz.id}/notebook` });
    expect(captured.statusCode).toBe(200);
    const capturedRoutine = captured.json().routines[0];
    expect(capturedRoutine.routineFigures.map((item: { id: string }) => item.id)).toEqual([
      second.id,
      first.id,
      third.id,
    ]);
    expect(capturedRoutine.routineFigures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          figureId: naturalTurn.id,
          figureVariantId: naturalTurn.variants[0].id,
          done: true,
        }),
        expect.objectContaining({
          id: second.id,
          figureName: 'Reverse Turn',
          figureVariantName: 'Výchozí varianta',
          done: false,
        }),
        expect.objectContaining({
          id: third.id,
          figureId: null,
          figureVariantId: null,
          done: false,
        }),
      ]),
    );

    await app.close();
    persistence.close();
    const reopened = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const reopenedApp = await buildNotebookServer(reopened);
    const reloaded = await reopenedApp.inject({
      method: 'GET',
      url: `/api/dances/${waltz.id}/notebook`,
    });
    expect(reloaded.statusCode).toBe(200);
    expect(reloaded.json()).toEqual(captured.json());
    await reopenedApp.close();
    reopened.close();
  });
});

async function buildNotebookServer(persistence: PersistenceContext) {
  const pairs = new SqlitePairRepository(persistence.database);
  const dances = new SqliteDanceCatalogue(persistence.database);
  const figures = new SqliteFigureRepository(persistence.database);
  const routines = new SqliteRoutineRepository(persistence.database);
  return buildServer({
    healthQuery: new GetHealthQuery(persistence.healthStatusReader),
    pairServices: {
      getAppState: new GetAppStateQuery(pairs, dances),
      initializePair: new InitializePairCommand(pairs),
      updatePairNames: new UpdatePairNamesCommand(pairs),
    },
    notebookServices: {
      getDanceNotebook: new GetDanceNotebookQuery(dances, figures, routines),
      createFigure: new CreateFigureCommand(figures),
      createRoutine: new CreateRoutineCommand(routines),
      addPlaceholder: new AddRoutineFigurePlaceholderCommand(routines),
      assignRoutineFigure: new AssignRoutineFigureCommand(routines),
      createFigureForRoutineFigure: new CreateFigureForRoutineFigureCommand(routines),
      moveRoutineFigure: new MoveRoutineFigureCommand(routines),
      setRoutineFigureDone: new SetRoutineFigureDoneCommand(routines),
    },
  });
}
