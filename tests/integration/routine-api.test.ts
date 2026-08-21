import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { GetAppStateQuery } from '../../src/application/app-state/get-app-state.js';
import {
  CreateFigureCommand,
  AddFigureAliasCommand,
  RemoveFigureAliasCommand,
  UpdateFigureNamesCommand,
  UpdateFigureVariantTimingCommand,
} from '../../src/application/figure/figure-use-cases.js';
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
  CreateRoutineSectionCommand,
  MoveRoutineFigureCommand,
  MoveRoutineFigureToSectionCommand,
  RemoveRoutineFigureCommand,
  MoveRoutineSectionCommand,
  RenameRoutineSectionCommand,
} from '../../src/application/routine/routine-use-cases.js';
import { createEntityId } from '../../src/domain/identity.js';
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

    const czechOnly = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { nameCs: 'Promenáda', nameEn: null },
    });
    expect(czechOnly.statusCode).toBe(201);
    expect(czechOnly.json()).toMatchObject({ nameCs: 'Promenáda', nameEn: null });
    const englishOnly = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { nameCs: null, nameEn: 'Promenade Position' },
    });
    expect(englishOnly.statusCode).toBe(201);
    expect(englishOnly.json()).toMatchObject({ nameCs: null, nameEn: 'Promenade Position' });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/dances/${waltz.id}/figures`,
          payload: { nameCs: '  ', nameEn: null },
        })
      ).statusCode,
    ).toBe(400);

    const createdFigure = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { nameCs: 'Otočka vpravo', nameEn: 'Natural Turn' },
    });
    expect(createdFigure.statusCode).toBe(201);
    const naturalTurn = createdFigure.json();
    expect(naturalTurn).toMatchObject({ nameCs: 'Otočka vpravo', nameEn: 'Natural Turn' });
    expect(naturalTurn.variants).toHaveLength(1);
    const timing = await app.inject({
      method: 'PUT',
      url: `/api/figure-variants/${naturalTurn.variants[0].id}/timing-notation`,
      payload: { timingNotation: '1 – 2 & 3' },
    });
    expect(timing.statusCode).toBe(200);
    expect(timing.json().variants[0].timingNotation).toBe('1 – 2 & 3');

    const createdRoutine = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/routines`,
      payload: { name: 'Waltz – naše sestava' },
    });
    expect(createdRoutine.statusCode).toBe(201);
    const routine = createdRoutine.json();
    expect(routine).not.toHaveProperty('routineFigures');
    expect(routine.sections).toEqual([
      expect.objectContaining({ name: 'Část 1', position: 1, routineFigures: [] }),
    ]);
    const firstSection = routine.sections[0];
    const secondSectionResponse = await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/sections`,
      payload: { name: 'První krátká strana' },
    });
    expect(secondSectionResponse.statusCode).toBe(201);
    const secondSection = secondSectionResponse.json();
    const thirdSectionResponse = await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/sections`,
      payload: { name: 'Prázdná část' },
    });
    expect(thirdSectionResponse.statusCode).toBe(201);
    const thirdSection = thirdSectionResponse.json();
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/routine-sections/${firstSection.id}/name`,
          payload: { name: 'První dlouhá strana' },
        })
      ).statusCode,
    ).toBe(200);

    const placeholders = await Promise.all(
      [firstSection.id, firstSection.id, secondSection.id].map((sectionId) =>
        app.inject({
          method: 'POST',
          url: `/api/routine-sections/${sectionId}/routine-figures`,
        }),
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
      payload: { nameCs: 'Otočka vlevo', nameEn: 'Reverse Turn' },
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
          url: `/api/routine-figures/${first.id}/section`,
          payload: { routineSectionId: thirdSection.id },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/routine-sections/${thirdSection.id}/move`,
          payload: { beforeRoutineSectionId: secondSection.id },
        })
      ).statusCode,
    ).toBe(200);

    const captured = await app.inject({ method: 'GET', url: `/api/dances/${waltz.id}/notebook` });
    expect(captured.statusCode).toBe(200);
    const capturedRoutine = captured.json().routines[0];
    expect(capturedRoutine).not.toHaveProperty('routineFigures');
    expect(capturedRoutine.sections.map((section: { id: string }) => section.id)).toEqual([
      firstSection.id,
      thirdSection.id,
      secondSection.id,
    ]);
    const capturedRoutineFigures = capturedRoutine.sections.flatMap(
      (section: { routineFigures: unknown[] }) => section.routineFigures,
    );
    expect(capturedRoutineFigures.map((item: { id: string }) => item.id)).toEqual([
      second.id,
      first.id,
      third.id,
    ]);
    expect(capturedRoutineFigures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          sectionId: thirdSection.id,
          position: 1,
          figureId: naturalTurn.id,
          figureVariantId: naturalTurn.variants[0].id,
        }),
        expect.objectContaining({
          id: second.id,
          sectionId: firstSection.id,
          position: 1,
          figureNameEn: 'Reverse Turn',
          figureVariantName: 'Výchozí varianta',
        }),
        expect.objectContaining({
          id: third.id,
          sectionId: secondSection.id,
          position: 1,
          figureId: null,
          figureVariantId: null,
        }),
      ]),
    );
    expect(
      capturedRoutineFigures.every(
        (routineFigure: Record<string, unknown>) => !('done' in routineFigure),
      ),
    ).toBe(true);

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

  it('removes only the requested RoutineFigure occurrence through its focused endpoint', async () => {
    const root = await createTemporaryDirectory('routine-figure-removal-api');
    temporaryDirectories.push(root);
    const paths = resolveDataPaths(root);
    const persistence = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const app = await buildNotebookServer(persistence);
    const waltz = new SqliteDanceCatalogue(persistence.database)
      .list()
      .find((dance) => dance.code === 'WALTZ');
    if (!waltz) throw new Error('Testovací Waltz nebyl nalezen.');

    const figure = (
      await app.inject({
        method: 'POST',
        url: `/api/dances/${waltz.id}/figures`,
        payload: { nameCs: 'Otočka vpravo', nameEn: 'Natural Turn' },
      })
    ).json();
    const routine = (
      await app.inject({
        method: 'POST',
        url: `/api/dances/${waltz.id}/routines`,
        payload: { name: 'Trénink' },
      })
    ).json();
    const section = routine.sections[0];
    const occurrences = await Promise.all(
      [0, 1, 2].map(async () =>
        (
          await app.inject({
            method: 'POST',
            url: `/api/routine-sections/${section.id}/routine-figures`,
          })
        ).json(),
      ),
    );
    for (const occurrence of occurrences) {
      expect(
        (
          await app.inject({
            method: 'PUT',
            url: `/api/routine-figures/${occurrence.id}/assignment`,
            payload: { figureId: figure.id, figureVariantId: null },
          })
        ).statusCode,
      ).toBe(200);
    }

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/routine-figures/${occurrences[1].id}`,
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json()).toEqual({ status: 'ok' });
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/routine-figures/${occurrences[1].id}` }))
        .statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: 'DELETE', url: '/api/routine-figures/neplatne-id' })).statusCode,
    ).toBe(400);

    const notebook = (
      await app.inject({ method: 'GET', url: `/api/dances/${waltz.id}/notebook` })
    ).json();
    expect(notebook.routines[0].sections[0].routineFigures).toEqual([
      expect.objectContaining({
        id: occurrences[0].id,
        position: 1,
        figureVariantId: figure.variants[0].id,
      }),
      expect.objectContaining({
        id: occurrences[2].id,
        position: 2,
        figureVariantId: figure.variants[0].id,
      }),
    ]);
    expect(notebook.figures).toEqual([
      expect.objectContaining({
        id: figure.id,
        variants: [expect.objectContaining({ id: figure.variants[0].id })],
      }),
    ]);

    await app.close();
    persistence.close();
  });

  it('renames a Figure through its focused endpoint and propagates the central name', async () => {
    const root = await createTemporaryDirectory('figure-rename-api');
    temporaryDirectories.push(root);
    const paths = resolveDataPaths(root);
    const persistence = await initializePersistence({
      paths,
      migrationsDirectory: resolve('migrations'),
    });
    const app = await buildNotebookServer(persistence);
    const waltz = new SqliteDanceCatalogue(persistence.database)
      .list()
      .find((dance) => dance.code === 'WALTZ');
    if (!waltz) throw new Error('Testovací Waltz nebyl nalezen.');

    const createdFigure = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { nameCs: 'Otočka v pravo', nameEn: null },
    });
    const figure = createdFigure.json();
    const createdRoutine = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/routines`,
      payload: { name: 'Trénink' },
    });
    const routine = createdRoutine.json();
    const routineSectionId = routine.sections[0].id;
    const first = (
      await app.inject({
        method: 'POST',
        url: `/api/routine-sections/${routineSectionId}/routine-figures`,
      })
    ).json();
    const second = (
      await app.inject({
        method: 'POST',
        url: `/api/routine-sections/${routineSectionId}/routine-figures`,
      })
    ).json();
    for (const occurrence of [first, second]) {
      expect(
        (
          await app.inject({
            method: 'PUT',
            url: `/api/routine-figures/${occurrence.id}/assignment`,
            payload: { figureId: figure.id, figureVariantId: figure.variants[0].id },
          })
        ).statusCode,
      ).toBe(200);
    }

    const renamed = await app.inject({
      method: 'PUT',
      url: `/api/figures/${figure.id}/names`,
      payload: { nameCs: 'Otočka vpravo', nameEn: 'Natural Turn' },
    });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json()).toMatchObject({
      id: figure.id,
      nameCs: 'Otočka vpravo',
      nameEn: 'Natural Turn',
      variants: [{ id: figure.variants[0].id, figureId: figure.id }],
    });

    const notebook = await app.inject({ method: 'GET', url: `/api/dances/${waltz.id}/notebook` });
    expect(notebook.statusCode).toBe(200);
    expect(
      notebook
        .json()
        .routines[0].sections[0].routineFigures.map(
          (item: { figureNameCs: string }) => item.figureNameCs,
        ),
    ).toEqual(['Otočka vpravo', 'Otočka vpravo']);
    const englishOnly = await app.inject({
      method: 'PUT',
      url: `/api/figures/${figure.id}/names`,
      payload: { nameCs: null, nameEn: 'Natural Turn' },
    });
    expect(englishOnly.statusCode).toBe(200);
    expect(englishOnly.json()).toMatchObject({ nameCs: null, nameEn: 'Natural Turn' });
    const invalid = await app.inject({
      method: 'PUT',
      url: `/api/figures/${figure.id}/names`,
      payload: { nameCs: '   ', nameEn: null },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      error: 'invalid_request',
      message: 'Figura musí mít český název, anglický název nebo alespoň jednu přezdívku.',
    });
    const unknown = await app.inject({
      method: 'PUT',
      url: `/api/figures/${createEntityId()}/names`,
      payload: { nameCs: 'Jiná figura', nameEn: null },
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toMatchObject({ error: 'figure_not_found' });

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
    expect(
      reloaded
        .json()
        .routines[0].sections[0].routineFigures.map(
          (item: { figureNameCs: string }) => item.figureNameCs,
        ),
    ).toEqual([null, null]);
    await reopenedApp.close();
    reopened.close();
  });

  it('supports alias-first creation and controlled alias mutation errors', async () => {
    const root = await createTemporaryDirectory('figure-alias-api');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const app = await buildNotebookServer(persistence);
    const waltz = new SqliteDanceCatalogue(persistence.database)
      .list()
      .find((dance) => dance.code === 'WALTZ');
    if (!waltz) throw new Error('Testovací Waltz nebyl nalezen.');
    const first = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { nameCs: null, nameEn: null, aliases: ['  Trojkrok  '] },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({
      nameCs: null,
      nameEn: null,
      aliases: [{ value: 'Trojkrok' }],
    });
    const figure = first.json();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/figures/${figure.id}/aliases`,
          payload: { alias: 'trojkrok' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/figures/${figure.id}/aliases`,
          payload: { alias: '   ' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/figures/${figure.id}/aliases`,
          payload: { alias: 'x'.repeat(201) },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/figures/${createEntityId()}/aliases`,
          payload: { alias: 'Jiná' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/figure-aliases/${figure.aliases[0].id}` }))
        .statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: 'DELETE', url: `/api/figure-aliases/${createEntityId()}` }))
        .statusCode,
    ).toBe(404);
    const second = await app.inject({
      method: 'POST',
      url: `/api/dances/${waltz.id}/figures`,
      payload: { nameCs: 'Jiná', nameEn: null, aliases: ['Trojkrok'] },
    });
    expect(second.statusCode).toBe(201);
    await app.close();
    persistence.close();
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
      updateFigureNames: new UpdateFigureNamesCommand(figures),
      updateFigureVariantTiming: new UpdateFigureVariantTimingCommand(figures),
      addFigureAlias: new AddFigureAliasCommand(figures),
      removeFigureAlias: new RemoveFigureAliasCommand(figures),
      createRoutine: new CreateRoutineCommand(routines),
      createRoutineSection: new CreateRoutineSectionCommand(routines),
      renameRoutineSection: new RenameRoutineSectionCommand(routines),
      moveRoutineSection: new MoveRoutineSectionCommand(routines),
      addPlaceholder: new AddRoutineFigurePlaceholderCommand(routines),
      assignRoutineFigure: new AssignRoutineFigureCommand(routines),
      createFigureForRoutineFigure: new CreateFigureForRoutineFigureCommand(routines),
      moveRoutineFigure: new MoveRoutineFigureCommand(routines),
      moveRoutineFigureToSection: new MoveRoutineFigureToSectionCommand(routines),
      removeRoutineFigure: new RemoveRoutineFigureCommand(routines),
    },
  });
}
