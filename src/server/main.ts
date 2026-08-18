import { GetHealthQuery } from '../application/health/get-health.js';
import { initializePersistence } from '../persistence/initialize.js';
import { buildServer } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const persistence = await initializePersistence({
    paths: config.dataPaths,
    migrationsDirectory: config.migrationsDirectory,
  });

  try {
    const app = await buildServer({
      healthQuery: new GetHealthQuery(persistence.healthStatusReader),
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
