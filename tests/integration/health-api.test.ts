import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { GetHealthQuery } from '../../src/application/health/get-health.js';
import { resolveDataPaths } from '../../src/persistence/data-directories.js';
import { initializePersistence } from '../../src/persistence/initialize.js';
import { buildServer } from '../../src/server/app.js';
import {
  createTemporaryDirectory,
  removeTemporaryDirectory,
} from '../helpers/temporary-directory.js';

describe('GET /api/health', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(removeTemporaryDirectory));
  });

  it('reports readiness only after persistence initialization', async () => {
    const root = await createTemporaryDirectory('health');
    temporaryDirectories.push(root);
    const persistence = await initializePersistence({
      paths: resolveDataPaths(root),
      migrationsDirectory: resolve('migrations'),
    });
    const app = await buildServer({
      healthQuery: new GetHealthQuery(
        persistence.healthStatusReader,
        () => new Date('2026-08-17T12:00:00.000Z'),
      ),
    });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      application: 'MyDanceBook',
      database: { status: 'ok', migrationVersion: 1 },
      timestamp: '2026-08-17T12:00:00.000Z',
    });
    await app.close();
    persistence.close();
  });
});
