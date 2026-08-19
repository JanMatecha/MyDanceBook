import { GetAppStateQuery } from '../application/app-state/get-app-state.js';
import {
  CreateFigureCommand,
  RenameFigureCommand,
} from '../application/figure/figure-use-cases.js';
import { GetHealthQuery } from '../application/health/get-health.js';
import {
  InitializePairCommand,
  UpdatePairNamesCommand,
} from '../application/pair/pair-use-cases.js';
import { GetDanceNotebookQuery } from '../application/routine/get-dance-notebook.js';
import {
  AddRoutineFigurePlaceholderCommand,
  AssignRoutineFigureCommand,
  CreateFigureForRoutineFigureCommand,
  CreateRoutineCommand,
  MoveRoutineFigureCommand,
  SetRoutineFigureDoneCommand,
} from '../application/routine/routine-use-cases.js';
import { initializePersistence } from '../persistence/initialize.js';
import { SqliteDanceCatalogue } from '../persistence/sqlite/dance-catalogue.js';
import { SqliteFigureRepository } from '../persistence/sqlite/figure-repository.js';
import { SqlitePairRepository } from '../persistence/sqlite/pair-repository.js';
import { SqliteRoutineRepository } from '../persistence/sqlite/routine-repository.js';
import { buildServer } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const persistence = await initializePersistence({
    paths: config.dataPaths,
    migrationsDirectory: config.migrationsDirectory,
  });

  try {
    const pairRepository = new SqlitePairRepository(persistence.database);
    const danceCatalogue = new SqliteDanceCatalogue(persistence.database);
    const figureRepository = new SqliteFigureRepository(persistence.database);
    const routineRepository = new SqliteRoutineRepository(persistence.database);
    const app = await buildServer({
      healthQuery: new GetHealthQuery(persistence.healthStatusReader),
      pairServices: {
        getAppState: new GetAppStateQuery(pairRepository, danceCatalogue),
        initializePair: new InitializePairCommand(pairRepository),
        updatePairNames: new UpdatePairNamesCommand(pairRepository),
      },
      notebookServices: {
        getDanceNotebook: new GetDanceNotebookQuery(
          danceCatalogue,
          figureRepository,
          routineRepository,
        ),
        createFigure: new CreateFigureCommand(figureRepository),
        renameFigure: new RenameFigureCommand(figureRepository),
        createRoutine: new CreateRoutineCommand(routineRepository),
        addPlaceholder: new AddRoutineFigurePlaceholderCommand(routineRepository),
        assignRoutineFigure: new AssignRoutineFigureCommand(routineRepository),
        createFigureForRoutineFigure: new CreateFigureForRoutineFigureCommand(routineRepository),
        moveRoutineFigure: new MoveRoutineFigureCommand(routineRepository),
        setRoutineFigureDone: new SetRoutineFigureDoneCommand(routineRepository),
      },
      staticRoot: config.staticRoot,
      logger: true,
    });

    let closing = false;
    const close = async (signal: string) => {
      if (closing) return;
      closing = true;
      app.log.info({ signal }, 'Ukončuji MyDanceBook.');
      await app.close();
      persistence.close();
    };

    process.once('SIGINT', () => void close('SIGINT'));
    process.once('SIGTERM', () => void close('SIGTERM'));

    await app.listen({ host: config.host, port: config.port });
  } catch (cause: unknown) {
    persistence.close();
    throw cause;
  }
}

main().catch((cause: unknown) => {
  console.error('MyDanceBook se nepodařilo spustit.', cause);
  process.exitCode = 1;
});
